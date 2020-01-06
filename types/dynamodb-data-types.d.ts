declare module 'dynamodb-data-types' {
  import {AttributeMap} from 'aws-sdk/clients/dynamodb';
  type Map = {[key: string]: any};

  export interface IAttributeValue {
    unwrap<T>(obj: AttributeMap): T;
    wrap<T>(obj: T): AttributeMap;
  }

  export const AttributeValue: IAttributeValue;
}
