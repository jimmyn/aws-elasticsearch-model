import {DynamoDBStreamEvent} from 'aws-lambda';
import bodyBuilder, {AggregationBuilder, FilterBuilder, QueryBuilder} from 'bodybuilder';
import {AttributeValue as attr} from 'dynamodb-data-types';
import {Client, ConfigOptions, IndicesCreateParams, SearchResponse} from 'elasticsearch';
import httpAwsEs from 'http-aws-es';
import {excludeKeys, validateConfig} from './utils';

// Read more about ElasticSearch mappings
// https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html
export interface IElasticMapping {
  [key: string]: {
    type?: string;
    analyzer?: string;
    index?: boolean;
    properties?: IElasticMapping;
    [key: string]: any;
  };
}

export interface IElasticSettings {
  [key: string]: any;
}

export type Item = {
  [key: string]: any;
};

export type Query = {
  [key: string]: any;
};

export interface ISearchResult<T> {
  items: T[];
  total: number;
  aggregations?: any;
  raw: SearchResponse<T>;
}

export interface IBodyBuilder<T>
  extends Object,
    QueryBuilder<IBodyBuilder<T>>,
    FilterBuilder<IBodyBuilder<T>>,
    AggregationBuilder<IBodyBuilder<T>> {
  sort(field: string, direction?: string): IBodyBuilder<T>;
  sort(field: string, body: object): IBodyBuilder<T>;
  sort(fields: Array<{[field: string]: string | object} | string>): IBodyBuilder<T>;
  from(quantity: number): IBodyBuilder<T>;
  size(quantity: number): IBodyBuilder<T>;
  rawOption(k: string, v: any): IBodyBuilder<T>;
  build(version?: string): object;
  exec(): Promise<ISearchResult<T>>;
}

export interface IElasticModelConfig {
  host: string;
  index: string;
  mapping?: IElasticMapping;
  settings?: IElasticSettings;
  idField?: string;
  apiVersion?: string;
  excludedFields?: string[];
  clientConfig: ConfigOptions;
}

export class ElasticModel<T extends Item> {
  client: Client;
  protected index: string;
  protected idField: string;
  protected excludedFields?: string[];
  protected mapping?: IElasticMapping;
  protected settings?: IElasticSettings;

  /**
   * Creates an instance of ElasticModel
   * @param config
   * @param config.host - ES instance url
   * @param config.index - ES index name
   * @param config.mapping - index mapping
   * @param config.settings - index settings
   * @param config.idField - unique id field for an item (default: id)
   * @param config.excludedFields - an array of fields excluded from ES
   * @param config.apiVersion - ES api version
   */
  constructor(config: IElasticModelConfig) {
    validateConfig(config, ['host', 'index']);

    this.index = config.index;
    this.mapping = config.mapping;
    this.settings = config.settings;
    this.excludedFields = config.excludedFields;
    this.idField = config.idField || 'id';
    this.client = new Client({
      hosts: config.host,
      apiVersion: config.apiVersion || '7.1',
      connectionClass: httpAwsEs,
      ...config.clientConfig
    });
  }

  /**
   * Imports multiple items to ElasticSearch
   * @param items - array of items to be imported
   */
  async bulkIndex(items: T[] = []) {
    await this.createIndexIfMissing();
    const body: Array<{[key: string]: any}> = [];
    items.forEach(item => {
      body.push({
        index: {
          _index: this.index,
          _id: item[this.idField]
        }
      });
      body.push(this.filterItemKeys(item));
    });
    return this.client.bulk({body});
  }

  /**
   * Executes search query
   * @param body - search request body
   */
  async search(body: Query): Promise<ISearchResult<T>> {
    const params = {
      index: this.index,
      body
    };
    const response = await this.client.search<T>(params);
    let total: number;
    if (typeof response.hits.total === 'number') {
      total = response.hits.total;
    } else {
      total = (response.hits.total as {value: number}).value;
    }
    return {
      items: response.hits.hits.map(hit => hit._source),
      total,
      aggregations: response.aggregations,
      raw: response
    };
  }

  /**
   * Returns BodyBuilder chainable query
   * read more - https://www.npmjs.com/package/bodybuilder
   * Call query.exec at the end to execute the query
   */
  queryBuilder(): IBodyBuilder<T> {
    const self = this;
    const query = (bodyBuilder() as unknown) as IBodyBuilder<T>;
    query.exec = function() {
      return self.search(this.build());
    };
    return query;
  }

  /**
   * Deletes index from ElasticSearch
   */
  async deleteIndex() {
    return this.client.indices.delete({index: this.index});
  }

  /**
   * Updates data in ElasticSearch from dynamoDB stream event
   * use this method in stream event handler and pass the event directly to it
   * In some cases id is a composition of multiple attributes (usually as a bast64 string)
   * You can convert dynamoDB record Keys object into an id by passing a function as a second argument
   * @param streamEvent - DynamoDB stream event
   * @param getIdFromKeys - a function that extracts id fields from dynamoDB record Keys object
   */
  async indexFromDynamoDBStream(
    streamEvent: DynamoDBStreamEvent,
    getIdFromKeys?: (keys: {[key: string]: any}) => string
  ) {
    const body: object[] = [];
    streamEvent.Records.forEach(record => {
      if (!record.dynamodb || !record.dynamodb.Keys) return;

      // dynamodb.Keys is a separate object that is present even in REMOVE event.
      // It contains doc id. Unwrapping it to get a normal object from dynamoDB format
      const keys = attr.unwrap<any>(record.dynamodb.Keys);
      const action = {
        _index: this.index,
        _id: getIdFromKeys ? getIdFromKeys(keys) : keys[this.idField]
      };
      switch (record.eventName) {
        case 'INSERT':
          body.push({index: action});
          body.push(this.filterItemKeys(attr.unwrap(record.dynamodb.NewImage!)));
          break;
        case 'MODIFY':
          body.push({update: action});
          body.push({doc: this.filterItemKeys(attr.unwrap(record.dynamodb.NewImage!))});
          break;
        case 'REMOVE':
          body.push({delete: action});
          break;
      }
    });
    return this.client.bulk({body});
  }

  /**
   * Removes excluded fields from the item
   * @param item
   */
  protected filterItemKeys(item: {[key: string]: any}) {
    if (!this.excludedFields) return item;
    return excludeKeys(item, this.excludedFields);
  }

  /**
   * Creates an index in ElasticSearch if it doesn't exist
   * if mapping was defined in config, it will be created for an index as well
   */
  async createIndexIfMissing() {
    // check if index already exists
    const indexExists = await this.client.indices.exists({index: this.index});
    if (indexExists) return true;

    const params: IndicesCreateParams = {index: this.index, body: {}};

    if (this.mapping) {
      params.body.mappings = {properties: this.mapping};
    }

    if (this.settings) {
      params.body.settings = this.settings;
    }

    return this.client.indices.create(params);
  }
}
