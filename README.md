# AWS ElasticSearch Model
A small library that simplifies [AWS ElasticSearch Service](https://aws.amazon.com/elasticsearch-service/) integration into serverless applications build with AWS Lambda

## Install
```
npm install aws-elasticsearch-model
```
or
```
yarn install aws-elasticsearch-model
```

## Intitialize

```typescript
import AWS from 'aws-sdk';
import ElasticModel from 'aws-elasticsearch-model';

/*
 ElasticModel uses aws-sdk's default behaviour to obtain region + credentials from your environment. 
 If you would like to set these manually, you can set them on aws-sdk:
*/
AWS.config.update({region: 'eu-west-1'});

const elasticModel = new ElasticModel({
  host: 'https://my-aws-elasticsearch-domain.eu-west-1.es.amazonaws.com',
  index: 'users'
});

```

## Index your data
ElasticModel will automatically create [elasticsearch index](https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-create-index.html) if missing

```typescript
const users = [
  {
    id: '0ee2fa0e-28c5-49d5-9156-5018f7263615',
    email: 'Ibrahim.Sawayn93@hotmail.com',
    name: 'Khalil_Lebsack'
  },
  {
    id: '04a425bf-07ed-4369-bc6f-e51ac414b93c',
    email: 'Rafaela_Kohler74@gmail.com',
    name: 'Ayden_Rodriguez'
  },
  {
    id: '81ab442a-b693-47e5-b9e1-6807cbb7978e',
    email: 'Howell73@gmail.com',
    name: 'Carlotta_Kuhic37'
  }
];

const result = await elasticModel.bulkIndex(users);
```

## Sync your index with DynamoDB table using Lambda
Quite often DynamoDB table is used as a source of trouth to store data and ElasticSearch is used to provide advanced seach capabilities. In this case a Lambda function is required to sync data betwean DynamoDB table and ElasticSearch index

Attach this lambda handler to your DynamoDB table and it will sync all the data changes with ElasticSearch

```typescript
import {DynamoDBStreamEvent} from 'aws-lambda';
import ElasticModel from 'aws-elasticsearch-model';

const elasticModel = new ElasticModel({
  host: 'https://my-aws-elasticsearch-domain.eu-west-1.es.amazonaws.com',
  index: 'users'
});

export const handler = async (event: DynamoDBStreamEvent) => {
  return elasticModel.indexFromDynamoDBStream(event);
};

```

Your lambda function needs to have a role attached to it that allows to access your ElasticSearch instance

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "es:ESHttpPost",
        "es:ESHttpPut",
        "es:ESHttpDelete"
      ],
      "Resource": "arn:aws:es:AWS_REGION:AWS_ACCOUNT_ID:domain/my-elasticsearch-domain/*",
      "Effect": "Allow"
    }
  ]
}
```

## Query your data
[queryBuilder](src/index.ts#L145) method will return a chainable function that allows easily build complex queries for elasticsearch with a simple, predictable api.

It uses [bodybuilder](https://github.com/danpaz/bodybuilder) package by [Daniel Paz-Soldan](https://github.com/danpaz)

To get full builder api check the [docs here](https://bodybuilder.js.org/docs/)

To execure the query call `query.exec()` at the end

```typescript
const query = elasticModel
  .queryBuilder()
  .orFilter('term', 'email', 'Vidal45@gmail.com')
  .orFilter('term', 'email', 'Marcel16@yahoo.com');

const result = await query.exec();
```

```typescript
{
  "items": [
  {
    "id": "554d9d95-b40b-4ddc-9fa9-ed3eb8b5c591",
    "email": "Vidal45@gmail.com",
    "name": "Beverly_Mayer18"
  },
  {
    "id": "cf39921a-41ce-49cc-b034-13fb1508c726",
    "email": "Marcel16@yahoo.com",
    "name": "Petra70"
  }
  ],
  "total": 2,
  "raw": {...} //elasticsearch response
}
```

You can also run a search query directly. The query above is equivalent to:

```typescript
const result = await elasticModel.search({
  query: {
    bool: {
      filter: {
        bool: {
          should: [
            {
              term: {
                email: 'Vidal45@gmail.com'
              }
            },
            {
              term: {
                email: 'Marcel16@yahoo.com'
              }
            }
          ]
        }
      }
    }
  }
});
```

## Use custom mapping and index settings
By default ElasticSearch will try to guess your data stracture but you can provide your own index mapping to improve search performance.

```typescript
const elasticModel = new ElasticModel({
  host: 'https://my-aws-elasticsearch-domain.eu-west-1.es.amazonaws.com',
  index: 'users',
  settings: {
    analysis: {
      analyzer: {
        email: {
          type: 'custom',
          tokenizer: 'uax_url_email'
        }
      }
    }
  },
  mapping: {
    id: {
      type: 'keyword'
    },
    email: {
      type: 'text',
      analyzer: 'email'
    },
    name: {
      type: 'text'
    }
  }
});
```

Read more about [mappings](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html) and [settings](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules.html#index-modules-settings)

## Use custom `id` field
By defaul ElasticModel will use `id` field in your data to privide unique `id` to ElasticSearch but it can be customized.

```typescript
const elasticModel = new ElasticModel({
  host: 'https://my-aws-elasticsearch-domain.eu-west-1.es.amazonaws.com',
  index: 'users',
  idField: 'userId'
});
```

When you sync your data with DynamoDB `DynamoDBStreamEvent` event provides `Keys` object that will contain a composit hash key of your item. For example if you have `hashKey: 'userId', rangeKey: 'createdAt'` by default only `userId` filed will be selected as `id` (if it is specified in config).

This behaviour can be customized: 

```typescript
export const handler = async (event: DynamoDBStreamEvent) => {
  return elasticModel.indexFromDynamoDBStream(event, keys => {
    // keys: {userId, createdAt}
    // use base64 encoded userId
    return new Buffer(keys.userId).toString('base64');
  });
};
```

## Exclude fields
To completly exclude fields from ElasticSearch you can provide `excludedFields` option. This option will remove the field before data is submited.

```typescript
const elasticModel = new ElasticModel({
  host: 'https://my-aws-elasticsearch-domain.eu-west-1.es.amazonaws.com',
  index: 'users',
  excludedFields: ['email']
});
```
If you want field value to be stored but not indexed or available for search you can set `index: false` parameter in mapping

```typescript
const elasticModel = new ElasticModel({
  host: 'https://my-aws-elasticsearch-domain.eu-west-1.es.amazonaws.com',
  index: 'users',
  mapping: {
    id: {
      type: 'keyword'
    },
    email: {
      index: false,
      type: 'text'
    },
    name: {
      type: 'text'
    }
  }
});
```

## Access ElasticSearch client
ElasticModel provides direct access to [elasticsearch client](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/16.x/index.html). You can access client instance as `elasticModel.client`

## Avaliable config options
You can find all config options [here](src/index.ts#L72)
