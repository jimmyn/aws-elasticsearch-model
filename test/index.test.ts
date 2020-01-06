import {Client} from 'elasticsearch';
import {dynamoDBStreamEvent} from './fixtures';
import {ElasticModel} from 'index';

const defaultConfig = {
  host: 'https://someurl.com',
  index: 'existing-index'
};

describe('ElasticModel', () => {
  beforeEach(() => {
    // @ts-ignore
    Client.mockClear();
  });

  it('should throw en error if required config is missing', () => {
    // @ts-ignore
    expect(() => new ElasticModel({})).toThrowErrorMatchingSnapshot();
    // @ts-ignore
    expect(() => new ElasticModel({host: 'https://someurl.com'})).toThrowErrorMatchingSnapshot();
    expect(
      () =>
        // @ts-ignore
        new ElasticModel({
          host: 'https://someurl.com'
        })
    ).toThrowErrorMatchingSnapshot();
    expect(
      () =>
        // @ts-ignore
        new ElasticModel({
          host: 'https://someurl.com',
          index: 'user'
        })
    ).not.toThrow();
  });

  test('bulkIndex should create index if missing', async () => {
    const config = {
      host: 'https://someurl.com',
      index: 'missing-index',
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
        email: {
          type: 'email'
        },
        name: {
          type: 'text'
        }
      }
    };
    const data = [
      {
        id: 'some_id',
        email: 'example@email.com'
      }
    ];
    const model = new ElasticModel(config);
    // @ts-ignore
    const client = Client.mock.instances[0];
    const result = await model.bulkIndex(data);
    expect(client.indices.exists.mock.calls[0][0]).toMatchSnapshot();
    expect(client.indices.create.mock.calls[0][0]).toMatchSnapshot();
    return expect(result).toMatchSnapshot();
  });

  test('deleteIndex should work correctly', async () => {
    const model = new ElasticModel(defaultConfig);
    // @ts-ignore
    const client = Client.mock.instances[0];
    const result = await model.deleteIndex();
    expect(client.indices.delete).toHaveBeenCalledWith({index: defaultConfig.index});
    return expect(result).toMatchSnapshot();
  });

  test('bulkIndex should not create index if already exists', async () => {
    const data = [
      {
        id: 'some_id',
        email: 'example@email.com'
      }
    ];
    const model = new ElasticModel(defaultConfig);
    // @ts-ignore
    const client = Client.mock.instances[0];
    const result = await model.bulkIndex(data);
    expect(client.indices.exists).toHaveBeenCalledWith({index: defaultConfig.index});
    expect(client.indices.create).not.toHaveBeenCalled();
    return expect(result).toMatchSnapshot();
  });

  test('search should return correct result', () => {
    const model = new ElasticModel(defaultConfig);
    return expect(model.search({size: 5, from: 5})).resolves.toMatchSnapshot();
  });

  test('buildQuery should work correctly', async () => {
    const model = new ElasticModel(defaultConfig);
    const searchSpy = jest.spyOn(model, 'search');
    const query = model
      .buildQuery()
      .sort('createdAt', 'desc')
      .from(5)
      .size(5);

    expect(query.exec).toBeDefined();

    const result = await query.exec();
    expect(result).toMatchSnapshot();
    expect(searchSpy).toHaveBeenCalledWith({
      size: 5,
      from: 5,
      sort: [{createdAt: {order: 'desc'}}]
    });
  });

  test('indexFromDynamoDBStream should generate correct bulk request', async () => {
    const config = {
      host: 'https://someurl.com',
      index: 'existing-index'
    };
    const model = new ElasticModel(config);
    // @ts-ignore
    const client = Client.mock.instances[0];
    await model.indexFromDynamoDBStream(dynamoDBStreamEvent);
    expect(client.bulk.mock.calls[0]).toMatchSnapshot();
  });

  test('indexFromDynamoDBStream should exclude fields specified in excludedFields array', async () => {
    const config = {
      host: 'https://someurl.com',
      index: 'existing-index',
      excludedFields: ['email']
    };
    const model = new ElasticModel(config);
    // @ts-ignore
    const client = Client.mock.instances[0];
    await model.indexFromDynamoDBStream(dynamoDBStreamEvent);
    expect(client.bulk.mock.calls[0]).toMatchSnapshot();
  });

  test('bulkIndex should exclude fields specified in excludedFields array', async () => {
    const config = {
      host: 'https://someurl.com',
      index: 'existing-index',
      excludedFields: ['email']
    };
    const data = [
      {
        id: 'some_id',
        email: 'example@email.com'
      }
    ];
    const model = new ElasticModel(config);
    // @ts-ignore
    const client = Client.mock.instances[0];
    await model.bulkIndex(data);
    expect(client.bulk.mock.calls[0]).toMatchSnapshot();
  });
});
