# AWS ElasticSearch Model
A simple library that simplifies [AWS ElasticSeach Service](https://aws.amazon.com/elasticsearch-service/) integration into serverless applications build with AWS Lambda

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
