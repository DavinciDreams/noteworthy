import {
  Collection,
  Documents,
  ExprArg,
  Function,
  Get,
  Lambda,
  Map,
  NewId,
  Paginate,
  Reverse,
  Var,
} from 'faunadb';
import { q } from '../lib/faunadb/faunadb';

const { Exists, If, Delete, Update, CreateFunction, CreateRole, Role } = q;

// Inspiration from https://github.com/fauna-brecht/faunadb-auth-skeleton-frontend/blob/default/fauna-queries/helpers/fql.js

export const DeleteIfExists = (ref: ExprArg) => If(Exists(ref), Delete(ref), false);

export const IfNotExists = (ref: ExprArg, then: ExprArg) => If(Exists(ref), false, then);

export const CreateOrUpdateFunction = (obj: any) => If(
  Exists(Function(obj.name)),
  Update(Function(obj.name), { body: obj.body, role: obj.role }),
  CreateFunction({ name: obj.name, body: obj.body, role: obj.role }),
);

export const CreateOrUpdateRole = (obj: any) => If(
  Exists(Role(obj.name)),
  Update(Role(obj.name), { membership: obj.membership, privileges: obj.privileges }),
  CreateRole(obj),
);

/**
 * Returns all documents in a collection.
 *
 * @param collectionName
 *
 * @see https://fauna.com/blog/modernizing-from-postgresql-to-serverless-with-fauna-part-1#select
 */
export const SelectAll = (collectionName: string) => Map(
  Paginate(Documents(Collection(collectionName))),
  Lambda(
    ['ref'],
    Get(Var('ref')),
  ),
);

/**
 * Returns a collection's documents.
 *
 * Equivalent to SQL "desc table".
 *
 * @param collectionName
 */
export const DescribeCollection = (collectionName: string) => {
  return Paginate(Reverse(Documents(Collection(collectionName))));
};

/**
 * The NewId function produces a unique number.
 *
 * This number is guaranteed to be unique across the entire cluster and once generated is never generated a second time.
 *
 * @see https://docs.fauna.com/fauna/current/api/fql/functions/newid?lang=javascript
 */
export const GetNewId = () => {
  return NewId();
};
