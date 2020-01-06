import {DynamoDBStreamEvent} from 'aws-lambda';

export const dynamoDBStreamEvent: DynamoDBStreamEvent = {
  Records: [
    {
      eventID: '3e5dd41500a1b1f9a0cd4274b0104d37',
      eventName: 'INSERT',
      eventVersion: '1.1',
      eventSource: 'aws:dynamodb',
      awsRegion: 'eu-west-1',
      dynamodb: {
        ApproximateCreationDateTime: 1539636240,
        Keys: {
          id: {
            S: 'some-id'
          }
        },
        NewImage: {
          id: {
            S: 'some-id'
          },
          email: {
            S: 'email@example.com'
          }
        },
        SequenceNumber: '57609000000000001485363138',
        SizeBytes: 105,
        StreamViewType: 'NEW_IMAGE'
      },
      eventSourceARN:
        'arn:aws:dynamodb:eu-west-1:ACCOUNT_ID:table/TABLE_NAME/stream/2018-10-03T15:15:59.162'
    },
    {
      eventID: 'b4d682c0e3116b5dd633dd09247182bd',
      eventName: 'REMOVE',
      eventVersion: '1.1',
      eventSource: 'aws:dynamodb',
      awsRegion: 'eu-west-1',
      dynamodb: {
        ApproximateCreationDateTime: 1539636300,
        Keys: {
          id: {
            S: 'some-id'
          }
        },
        SequenceNumber: '57609100000000001485392357',
        SizeBytes: 32,
        StreamViewType: 'NEW_IMAGE'
      },
      eventSourceARN:
        'arn:aws:dynamodb:eu-west-1:ACCOUNT_ID:table/TABLE_NAME/stream/2018-10-03T15:15:59.162'
    },
    {
      eventID: '1502cbbb80137beb018d5195c2c2b63e',
      eventName: 'MODIFY',
      eventVersion: '1.1',
      eventSource: 'aws:dynamodb',
      awsRegion: 'eu-west-1',
      dynamodb: {
        ApproximateCreationDateTime: 1539635040,
        Keys: {
          id: {
            S: 'some-id'
          }
        },
        NewImage: {
          id: {
            S: 'some-id'
          },
          email: {
            S: 'email@example.com'
          }
        },
        SequenceNumber: '57608500000000001484605720',
        SizeBytes: 163,
        StreamViewType: 'NEW_IMAGE'
      },
      eventSourceARN:
        'arn:aws:dynamodb:eu-west-1:ACCOUNT_ID:table/TABLE_NAME/stream/2018-10-03T15:15:59.162'
    }
  ]
};
