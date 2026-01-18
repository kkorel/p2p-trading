
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Provider
 * 
 */
export type Provider = $Result.DefaultSelection<Prisma.$ProviderPayload>
/**
 * Model CatalogItem
 * 
 */
export type CatalogItem = $Result.DefaultSelection<Prisma.$CatalogItemPayload>
/**
 * Model CatalogOffer
 * 
 */
export type CatalogOffer = $Result.DefaultSelection<Prisma.$CatalogOfferPayload>
/**
 * Model OfferBlock
 * 
 */
export type OfferBlock = $Result.DefaultSelection<Prisma.$OfferBlockPayload>
/**
 * Model Order
 * 
 */
export type Order = $Result.DefaultSelection<Prisma.$OrderPayload>
/**
 * Model Event
 * 
 */
export type Event = $Result.DefaultSelection<Prisma.$EventPayload>

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Providers
 * const providers = await prisma.provider.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Providers
   * const providers = await prisma.provider.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.provider`: Exposes CRUD operations for the **Provider** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Providers
    * const providers = await prisma.provider.findMany()
    * ```
    */
  get provider(): Prisma.ProviderDelegate<ExtArgs>;

  /**
   * `prisma.catalogItem`: Exposes CRUD operations for the **CatalogItem** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CatalogItems
    * const catalogItems = await prisma.catalogItem.findMany()
    * ```
    */
  get catalogItem(): Prisma.CatalogItemDelegate<ExtArgs>;

  /**
   * `prisma.catalogOffer`: Exposes CRUD operations for the **CatalogOffer** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CatalogOffers
    * const catalogOffers = await prisma.catalogOffer.findMany()
    * ```
    */
  get catalogOffer(): Prisma.CatalogOfferDelegate<ExtArgs>;

  /**
   * `prisma.offerBlock`: Exposes CRUD operations for the **OfferBlock** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more OfferBlocks
    * const offerBlocks = await prisma.offerBlock.findMany()
    * ```
    */
  get offerBlock(): Prisma.OfferBlockDelegate<ExtArgs>;

  /**
   * `prisma.order`: Exposes CRUD operations for the **Order** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Orders
    * const orders = await prisma.order.findMany()
    * ```
    */
  get order(): Prisma.OrderDelegate<ExtArgs>;

  /**
   * `prisma.event`: Exposes CRUD operations for the **Event** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Events
    * const events = await prisma.event.findMany()
    * ```
    */
  get event(): Prisma.EventDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Provider: 'Provider',
    CatalogItem: 'CatalogItem',
    CatalogOffer: 'CatalogOffer',
    OfferBlock: 'OfferBlock',
    Order: 'Order',
    Event: 'Event'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "provider" | "catalogItem" | "catalogOffer" | "offerBlock" | "order" | "event"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Provider: {
        payload: Prisma.$ProviderPayload<ExtArgs>
        fields: Prisma.ProviderFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProviderFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProviderPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProviderFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProviderPayload>
          }
          findFirst: {
            args: Prisma.ProviderFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProviderPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProviderFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProviderPayload>
          }
          findMany: {
            args: Prisma.ProviderFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProviderPayload>[]
          }
          create: {
            args: Prisma.ProviderCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProviderPayload>
          }
          createMany: {
            args: Prisma.ProviderCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProviderCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProviderPayload>[]
          }
          delete: {
            args: Prisma.ProviderDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProviderPayload>
          }
          update: {
            args: Prisma.ProviderUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProviderPayload>
          }
          deleteMany: {
            args: Prisma.ProviderDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProviderUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ProviderUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProviderPayload>
          }
          aggregate: {
            args: Prisma.ProviderAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProvider>
          }
          groupBy: {
            args: Prisma.ProviderGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProviderGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProviderCountArgs<ExtArgs>
            result: $Utils.Optional<ProviderCountAggregateOutputType> | number
          }
        }
      }
      CatalogItem: {
        payload: Prisma.$CatalogItemPayload<ExtArgs>
        fields: Prisma.CatalogItemFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CatalogItemFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogItemPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CatalogItemFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogItemPayload>
          }
          findFirst: {
            args: Prisma.CatalogItemFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogItemPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CatalogItemFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogItemPayload>
          }
          findMany: {
            args: Prisma.CatalogItemFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogItemPayload>[]
          }
          create: {
            args: Prisma.CatalogItemCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogItemPayload>
          }
          createMany: {
            args: Prisma.CatalogItemCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CatalogItemCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogItemPayload>[]
          }
          delete: {
            args: Prisma.CatalogItemDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogItemPayload>
          }
          update: {
            args: Prisma.CatalogItemUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogItemPayload>
          }
          deleteMany: {
            args: Prisma.CatalogItemDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CatalogItemUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.CatalogItemUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogItemPayload>
          }
          aggregate: {
            args: Prisma.CatalogItemAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCatalogItem>
          }
          groupBy: {
            args: Prisma.CatalogItemGroupByArgs<ExtArgs>
            result: $Utils.Optional<CatalogItemGroupByOutputType>[]
          }
          count: {
            args: Prisma.CatalogItemCountArgs<ExtArgs>
            result: $Utils.Optional<CatalogItemCountAggregateOutputType> | number
          }
        }
      }
      CatalogOffer: {
        payload: Prisma.$CatalogOfferPayload<ExtArgs>
        fields: Prisma.CatalogOfferFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CatalogOfferFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogOfferPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CatalogOfferFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogOfferPayload>
          }
          findFirst: {
            args: Prisma.CatalogOfferFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogOfferPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CatalogOfferFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogOfferPayload>
          }
          findMany: {
            args: Prisma.CatalogOfferFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogOfferPayload>[]
          }
          create: {
            args: Prisma.CatalogOfferCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogOfferPayload>
          }
          createMany: {
            args: Prisma.CatalogOfferCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CatalogOfferCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogOfferPayload>[]
          }
          delete: {
            args: Prisma.CatalogOfferDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogOfferPayload>
          }
          update: {
            args: Prisma.CatalogOfferUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogOfferPayload>
          }
          deleteMany: {
            args: Prisma.CatalogOfferDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CatalogOfferUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.CatalogOfferUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CatalogOfferPayload>
          }
          aggregate: {
            args: Prisma.CatalogOfferAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCatalogOffer>
          }
          groupBy: {
            args: Prisma.CatalogOfferGroupByArgs<ExtArgs>
            result: $Utils.Optional<CatalogOfferGroupByOutputType>[]
          }
          count: {
            args: Prisma.CatalogOfferCountArgs<ExtArgs>
            result: $Utils.Optional<CatalogOfferCountAggregateOutputType> | number
          }
        }
      }
      OfferBlock: {
        payload: Prisma.$OfferBlockPayload<ExtArgs>
        fields: Prisma.OfferBlockFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OfferBlockFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OfferBlockPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OfferBlockFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OfferBlockPayload>
          }
          findFirst: {
            args: Prisma.OfferBlockFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OfferBlockPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OfferBlockFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OfferBlockPayload>
          }
          findMany: {
            args: Prisma.OfferBlockFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OfferBlockPayload>[]
          }
          create: {
            args: Prisma.OfferBlockCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OfferBlockPayload>
          }
          createMany: {
            args: Prisma.OfferBlockCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.OfferBlockCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OfferBlockPayload>[]
          }
          delete: {
            args: Prisma.OfferBlockDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OfferBlockPayload>
          }
          update: {
            args: Prisma.OfferBlockUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OfferBlockPayload>
          }
          deleteMany: {
            args: Prisma.OfferBlockDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.OfferBlockUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.OfferBlockUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OfferBlockPayload>
          }
          aggregate: {
            args: Prisma.OfferBlockAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateOfferBlock>
          }
          groupBy: {
            args: Prisma.OfferBlockGroupByArgs<ExtArgs>
            result: $Utils.Optional<OfferBlockGroupByOutputType>[]
          }
          count: {
            args: Prisma.OfferBlockCountArgs<ExtArgs>
            result: $Utils.Optional<OfferBlockCountAggregateOutputType> | number
          }
        }
      }
      Order: {
        payload: Prisma.$OrderPayload<ExtArgs>
        fields: Prisma.OrderFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OrderFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OrderFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          findFirst: {
            args: Prisma.OrderFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OrderFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          findMany: {
            args: Prisma.OrderFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>[]
          }
          create: {
            args: Prisma.OrderCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          createMany: {
            args: Prisma.OrderCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.OrderCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>[]
          }
          delete: {
            args: Prisma.OrderDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          update: {
            args: Prisma.OrderUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          deleteMany: {
            args: Prisma.OrderDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.OrderUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.OrderUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          aggregate: {
            args: Prisma.OrderAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateOrder>
          }
          groupBy: {
            args: Prisma.OrderGroupByArgs<ExtArgs>
            result: $Utils.Optional<OrderGroupByOutputType>[]
          }
          count: {
            args: Prisma.OrderCountArgs<ExtArgs>
            result: $Utils.Optional<OrderCountAggregateOutputType> | number
          }
        }
      }
      Event: {
        payload: Prisma.$EventPayload<ExtArgs>
        fields: Prisma.EventFieldRefs
        operations: {
          findUnique: {
            args: Prisma.EventFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.EventFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload>
          }
          findFirst: {
            args: Prisma.EventFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.EventFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload>
          }
          findMany: {
            args: Prisma.EventFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload>[]
          }
          create: {
            args: Prisma.EventCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload>
          }
          createMany: {
            args: Prisma.EventCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.EventCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload>[]
          }
          delete: {
            args: Prisma.EventDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload>
          }
          update: {
            args: Prisma.EventUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload>
          }
          deleteMany: {
            args: Prisma.EventDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.EventUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.EventUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload>
          }
          aggregate: {
            args: Prisma.EventAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateEvent>
          }
          groupBy: {
            args: Prisma.EventGroupByArgs<ExtArgs>
            result: $Utils.Optional<EventGroupByOutputType>[]
          }
          count: {
            args: Prisma.EventCountArgs<ExtArgs>
            result: $Utils.Optional<EventCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type ProviderCountOutputType
   */

  export type ProviderCountOutputType = {
    items: number
    offers: number
    orders: number
    blocks: number
  }

  export type ProviderCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    items?: boolean | ProviderCountOutputTypeCountItemsArgs
    offers?: boolean | ProviderCountOutputTypeCountOffersArgs
    orders?: boolean | ProviderCountOutputTypeCountOrdersArgs
    blocks?: boolean | ProviderCountOutputTypeCountBlocksArgs
  }

  // Custom InputTypes
  /**
   * ProviderCountOutputType without action
   */
  export type ProviderCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProviderCountOutputType
     */
    select?: ProviderCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ProviderCountOutputType without action
   */
  export type ProviderCountOutputTypeCountItemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CatalogItemWhereInput
  }

  /**
   * ProviderCountOutputType without action
   */
  export type ProviderCountOutputTypeCountOffersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CatalogOfferWhereInput
  }

  /**
   * ProviderCountOutputType without action
   */
  export type ProviderCountOutputTypeCountOrdersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OrderWhereInput
  }

  /**
   * ProviderCountOutputType without action
   */
  export type ProviderCountOutputTypeCountBlocksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OfferBlockWhereInput
  }


  /**
   * Count Type CatalogItemCountOutputType
   */

  export type CatalogItemCountOutputType = {
    offers: number
    blocks: number
  }

  export type CatalogItemCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    offers?: boolean | CatalogItemCountOutputTypeCountOffersArgs
    blocks?: boolean | CatalogItemCountOutputTypeCountBlocksArgs
  }

  // Custom InputTypes
  /**
   * CatalogItemCountOutputType without action
   */
  export type CatalogItemCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogItemCountOutputType
     */
    select?: CatalogItemCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * CatalogItemCountOutputType without action
   */
  export type CatalogItemCountOutputTypeCountOffersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CatalogOfferWhereInput
  }

  /**
   * CatalogItemCountOutputType without action
   */
  export type CatalogItemCountOutputTypeCountBlocksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OfferBlockWhereInput
  }


  /**
   * Count Type CatalogOfferCountOutputType
   */

  export type CatalogOfferCountOutputType = {
    blocks: number
    orders: number
  }

  export type CatalogOfferCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    blocks?: boolean | CatalogOfferCountOutputTypeCountBlocksArgs
    orders?: boolean | CatalogOfferCountOutputTypeCountOrdersArgs
  }

  // Custom InputTypes
  /**
   * CatalogOfferCountOutputType without action
   */
  export type CatalogOfferCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogOfferCountOutputType
     */
    select?: CatalogOfferCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * CatalogOfferCountOutputType without action
   */
  export type CatalogOfferCountOutputTypeCountBlocksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OfferBlockWhereInput
  }

  /**
   * CatalogOfferCountOutputType without action
   */
  export type CatalogOfferCountOutputTypeCountOrdersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OrderWhereInput
  }


  /**
   * Count Type OrderCountOutputType
   */

  export type OrderCountOutputType = {
    blocks: number
  }

  export type OrderCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    blocks?: boolean | OrderCountOutputTypeCountBlocksArgs
  }

  // Custom InputTypes
  /**
   * OrderCountOutputType without action
   */
  export type OrderCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrderCountOutputType
     */
    select?: OrderCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * OrderCountOutputType without action
   */
  export type OrderCountOutputTypeCountBlocksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OfferBlockWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Provider
   */

  export type AggregateProvider = {
    _count: ProviderCountAggregateOutputType | null
    _avg: ProviderAvgAggregateOutputType | null
    _sum: ProviderSumAggregateOutputType | null
    _min: ProviderMinAggregateOutputType | null
    _max: ProviderMaxAggregateOutputType | null
  }

  export type ProviderAvgAggregateOutputType = {
    trustScore: number | null
    totalOrders: number | null
    successfulOrders: number | null
  }

  export type ProviderSumAggregateOutputType = {
    trustScore: number | null
    totalOrders: number | null
    successfulOrders: number | null
  }

  export type ProviderMinAggregateOutputType = {
    id: string | null
    name: string | null
    trustScore: number | null
    totalOrders: number | null
    successfulOrders: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProviderMaxAggregateOutputType = {
    id: string | null
    name: string | null
    trustScore: number | null
    totalOrders: number | null
    successfulOrders: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProviderCountAggregateOutputType = {
    id: number
    name: number
    trustScore: number
    totalOrders: number
    successfulOrders: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ProviderAvgAggregateInputType = {
    trustScore?: true
    totalOrders?: true
    successfulOrders?: true
  }

  export type ProviderSumAggregateInputType = {
    trustScore?: true
    totalOrders?: true
    successfulOrders?: true
  }

  export type ProviderMinAggregateInputType = {
    id?: true
    name?: true
    trustScore?: true
    totalOrders?: true
    successfulOrders?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProviderMaxAggregateInputType = {
    id?: true
    name?: true
    trustScore?: true
    totalOrders?: true
    successfulOrders?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProviderCountAggregateInputType = {
    id?: true
    name?: true
    trustScore?: true
    totalOrders?: true
    successfulOrders?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ProviderAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Provider to aggregate.
     */
    where?: ProviderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Providers to fetch.
     */
    orderBy?: ProviderOrderByWithRelationInput | ProviderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProviderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Providers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Providers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Providers
    **/
    _count?: true | ProviderCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ProviderAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ProviderSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProviderMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProviderMaxAggregateInputType
  }

  export type GetProviderAggregateType<T extends ProviderAggregateArgs> = {
        [P in keyof T & keyof AggregateProvider]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProvider[P]>
      : GetScalarType<T[P], AggregateProvider[P]>
  }




  export type ProviderGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProviderWhereInput
    orderBy?: ProviderOrderByWithAggregationInput | ProviderOrderByWithAggregationInput[]
    by: ProviderScalarFieldEnum[] | ProviderScalarFieldEnum
    having?: ProviderScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProviderCountAggregateInputType | true
    _avg?: ProviderAvgAggregateInputType
    _sum?: ProviderSumAggregateInputType
    _min?: ProviderMinAggregateInputType
    _max?: ProviderMaxAggregateInputType
  }

  export type ProviderGroupByOutputType = {
    id: string
    name: string
    trustScore: number
    totalOrders: number
    successfulOrders: number
    createdAt: Date
    updatedAt: Date
    _count: ProviderCountAggregateOutputType | null
    _avg: ProviderAvgAggregateOutputType | null
    _sum: ProviderSumAggregateOutputType | null
    _min: ProviderMinAggregateOutputType | null
    _max: ProviderMaxAggregateOutputType | null
  }

  type GetProviderGroupByPayload<T extends ProviderGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProviderGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProviderGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProviderGroupByOutputType[P]>
            : GetScalarType<T[P], ProviderGroupByOutputType[P]>
        }
      >
    >


  export type ProviderSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    trustScore?: boolean
    totalOrders?: boolean
    successfulOrders?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    items?: boolean | Provider$itemsArgs<ExtArgs>
    offers?: boolean | Provider$offersArgs<ExtArgs>
    orders?: boolean | Provider$ordersArgs<ExtArgs>
    blocks?: boolean | Provider$blocksArgs<ExtArgs>
    _count?: boolean | ProviderCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["provider"]>

  export type ProviderSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    trustScore?: boolean
    totalOrders?: boolean
    successfulOrders?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["provider"]>

  export type ProviderSelectScalar = {
    id?: boolean
    name?: boolean
    trustScore?: boolean
    totalOrders?: boolean
    successfulOrders?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ProviderInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    items?: boolean | Provider$itemsArgs<ExtArgs>
    offers?: boolean | Provider$offersArgs<ExtArgs>
    orders?: boolean | Provider$ordersArgs<ExtArgs>
    blocks?: boolean | Provider$blocksArgs<ExtArgs>
    _count?: boolean | ProviderCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ProviderIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $ProviderPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Provider"
    objects: {
      items: Prisma.$CatalogItemPayload<ExtArgs>[]
      offers: Prisma.$CatalogOfferPayload<ExtArgs>[]
      orders: Prisma.$OrderPayload<ExtArgs>[]
      blocks: Prisma.$OfferBlockPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      trustScore: number
      totalOrders: number
      successfulOrders: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["provider"]>
    composites: {}
  }

  type ProviderGetPayload<S extends boolean | null | undefined | ProviderDefaultArgs> = $Result.GetResult<Prisma.$ProviderPayload, S>

  type ProviderCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ProviderFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ProviderCountAggregateInputType | true
    }

  export interface ProviderDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Provider'], meta: { name: 'Provider' } }
    /**
     * Find zero or one Provider that matches the filter.
     * @param {ProviderFindUniqueArgs} args - Arguments to find a Provider
     * @example
     * // Get one Provider
     * const provider = await prisma.provider.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProviderFindUniqueArgs>(args: SelectSubset<T, ProviderFindUniqueArgs<ExtArgs>>): Prisma__ProviderClient<$Result.GetResult<Prisma.$ProviderPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Provider that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ProviderFindUniqueOrThrowArgs} args - Arguments to find a Provider
     * @example
     * // Get one Provider
     * const provider = await prisma.provider.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProviderFindUniqueOrThrowArgs>(args: SelectSubset<T, ProviderFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProviderClient<$Result.GetResult<Prisma.$ProviderPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Provider that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProviderFindFirstArgs} args - Arguments to find a Provider
     * @example
     * // Get one Provider
     * const provider = await prisma.provider.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProviderFindFirstArgs>(args?: SelectSubset<T, ProviderFindFirstArgs<ExtArgs>>): Prisma__ProviderClient<$Result.GetResult<Prisma.$ProviderPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Provider that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProviderFindFirstOrThrowArgs} args - Arguments to find a Provider
     * @example
     * // Get one Provider
     * const provider = await prisma.provider.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProviderFindFirstOrThrowArgs>(args?: SelectSubset<T, ProviderFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProviderClient<$Result.GetResult<Prisma.$ProviderPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Providers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProviderFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Providers
     * const providers = await prisma.provider.findMany()
     * 
     * // Get first 10 Providers
     * const providers = await prisma.provider.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const providerWithIdOnly = await prisma.provider.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProviderFindManyArgs>(args?: SelectSubset<T, ProviderFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProviderPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Provider.
     * @param {ProviderCreateArgs} args - Arguments to create a Provider.
     * @example
     * // Create one Provider
     * const Provider = await prisma.provider.create({
     *   data: {
     *     // ... data to create a Provider
     *   }
     * })
     * 
     */
    create<T extends ProviderCreateArgs>(args: SelectSubset<T, ProviderCreateArgs<ExtArgs>>): Prisma__ProviderClient<$Result.GetResult<Prisma.$ProviderPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Providers.
     * @param {ProviderCreateManyArgs} args - Arguments to create many Providers.
     * @example
     * // Create many Providers
     * const provider = await prisma.provider.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProviderCreateManyArgs>(args?: SelectSubset<T, ProviderCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Providers and returns the data saved in the database.
     * @param {ProviderCreateManyAndReturnArgs} args - Arguments to create many Providers.
     * @example
     * // Create many Providers
     * const provider = await prisma.provider.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Providers and only return the `id`
     * const providerWithIdOnly = await prisma.provider.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProviderCreateManyAndReturnArgs>(args?: SelectSubset<T, ProviderCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProviderPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Provider.
     * @param {ProviderDeleteArgs} args - Arguments to delete one Provider.
     * @example
     * // Delete one Provider
     * const Provider = await prisma.provider.delete({
     *   where: {
     *     // ... filter to delete one Provider
     *   }
     * })
     * 
     */
    delete<T extends ProviderDeleteArgs>(args: SelectSubset<T, ProviderDeleteArgs<ExtArgs>>): Prisma__ProviderClient<$Result.GetResult<Prisma.$ProviderPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Provider.
     * @param {ProviderUpdateArgs} args - Arguments to update one Provider.
     * @example
     * // Update one Provider
     * const provider = await prisma.provider.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProviderUpdateArgs>(args: SelectSubset<T, ProviderUpdateArgs<ExtArgs>>): Prisma__ProviderClient<$Result.GetResult<Prisma.$ProviderPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Providers.
     * @param {ProviderDeleteManyArgs} args - Arguments to filter Providers to delete.
     * @example
     * // Delete a few Providers
     * const { count } = await prisma.provider.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProviderDeleteManyArgs>(args?: SelectSubset<T, ProviderDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Providers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProviderUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Providers
     * const provider = await prisma.provider.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProviderUpdateManyArgs>(args: SelectSubset<T, ProviderUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Provider.
     * @param {ProviderUpsertArgs} args - Arguments to update or create a Provider.
     * @example
     * // Update or create a Provider
     * const provider = await prisma.provider.upsert({
     *   create: {
     *     // ... data to create a Provider
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Provider we want to update
     *   }
     * })
     */
    upsert<T extends ProviderUpsertArgs>(args: SelectSubset<T, ProviderUpsertArgs<ExtArgs>>): Prisma__ProviderClient<$Result.GetResult<Prisma.$ProviderPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Providers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProviderCountArgs} args - Arguments to filter Providers to count.
     * @example
     * // Count the number of Providers
     * const count = await prisma.provider.count({
     *   where: {
     *     // ... the filter for the Providers we want to count
     *   }
     * })
    **/
    count<T extends ProviderCountArgs>(
      args?: Subset<T, ProviderCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProviderCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Provider.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProviderAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProviderAggregateArgs>(args: Subset<T, ProviderAggregateArgs>): Prisma.PrismaPromise<GetProviderAggregateType<T>>

    /**
     * Group by Provider.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProviderGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProviderGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProviderGroupByArgs['orderBy'] }
        : { orderBy?: ProviderGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProviderGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProviderGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Provider model
   */
  readonly fields: ProviderFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Provider.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProviderClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    items<T extends Provider$itemsArgs<ExtArgs> = {}>(args?: Subset<T, Provider$itemsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CatalogItemPayload<ExtArgs>, T, "findMany"> | Null>
    offers<T extends Provider$offersArgs<ExtArgs> = {}>(args?: Subset<T, Provider$offersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CatalogOfferPayload<ExtArgs>, T, "findMany"> | Null>
    orders<T extends Provider$ordersArgs<ExtArgs> = {}>(args?: Subset<T, Provider$ordersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findMany"> | Null>
    blocks<T extends Provider$blocksArgs<ExtArgs> = {}>(args?: Subset<T, Provider$blocksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OfferBlockPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Provider model
   */ 
  interface ProviderFieldRefs {
    readonly id: FieldRef<"Provider", 'String'>
    readonly name: FieldRef<"Provider", 'String'>
    readonly trustScore: FieldRef<"Provider", 'Float'>
    readonly totalOrders: FieldRef<"Provider", 'Int'>
    readonly successfulOrders: FieldRef<"Provider", 'Int'>
    readonly createdAt: FieldRef<"Provider", 'DateTime'>
    readonly updatedAt: FieldRef<"Provider", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Provider findUnique
   */
  export type ProviderFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Provider
     */
    select?: ProviderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProviderInclude<ExtArgs> | null
    /**
     * Filter, which Provider to fetch.
     */
    where: ProviderWhereUniqueInput
  }

  /**
   * Provider findUniqueOrThrow
   */
  export type ProviderFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Provider
     */
    select?: ProviderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProviderInclude<ExtArgs> | null
    /**
     * Filter, which Provider to fetch.
     */
    where: ProviderWhereUniqueInput
  }

  /**
   * Provider findFirst
   */
  export type ProviderFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Provider
     */
    select?: ProviderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProviderInclude<ExtArgs> | null
    /**
     * Filter, which Provider to fetch.
     */
    where?: ProviderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Providers to fetch.
     */
    orderBy?: ProviderOrderByWithRelationInput | ProviderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Providers.
     */
    cursor?: ProviderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Providers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Providers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Providers.
     */
    distinct?: ProviderScalarFieldEnum | ProviderScalarFieldEnum[]
  }

  /**
   * Provider findFirstOrThrow
   */
  export type ProviderFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Provider
     */
    select?: ProviderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProviderInclude<ExtArgs> | null
    /**
     * Filter, which Provider to fetch.
     */
    where?: ProviderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Providers to fetch.
     */
    orderBy?: ProviderOrderByWithRelationInput | ProviderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Providers.
     */
    cursor?: ProviderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Providers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Providers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Providers.
     */
    distinct?: ProviderScalarFieldEnum | ProviderScalarFieldEnum[]
  }

  /**
   * Provider findMany
   */
  export type ProviderFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Provider
     */
    select?: ProviderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProviderInclude<ExtArgs> | null
    /**
     * Filter, which Providers to fetch.
     */
    where?: ProviderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Providers to fetch.
     */
    orderBy?: ProviderOrderByWithRelationInput | ProviderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Providers.
     */
    cursor?: ProviderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Providers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Providers.
     */
    skip?: number
    distinct?: ProviderScalarFieldEnum | ProviderScalarFieldEnum[]
  }

  /**
   * Provider create
   */
  export type ProviderCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Provider
     */
    select?: ProviderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProviderInclude<ExtArgs> | null
    /**
     * The data needed to create a Provider.
     */
    data: XOR<ProviderCreateInput, ProviderUncheckedCreateInput>
  }

  /**
   * Provider createMany
   */
  export type ProviderCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Providers.
     */
    data: ProviderCreateManyInput | ProviderCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Provider createManyAndReturn
   */
  export type ProviderCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Provider
     */
    select?: ProviderSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Providers.
     */
    data: ProviderCreateManyInput | ProviderCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Provider update
   */
  export type ProviderUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Provider
     */
    select?: ProviderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProviderInclude<ExtArgs> | null
    /**
     * The data needed to update a Provider.
     */
    data: XOR<ProviderUpdateInput, ProviderUncheckedUpdateInput>
    /**
     * Choose, which Provider to update.
     */
    where: ProviderWhereUniqueInput
  }

  /**
   * Provider updateMany
   */
  export type ProviderUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Providers.
     */
    data: XOR<ProviderUpdateManyMutationInput, ProviderUncheckedUpdateManyInput>
    /**
     * Filter which Providers to update
     */
    where?: ProviderWhereInput
  }

  /**
   * Provider upsert
   */
  export type ProviderUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Provider
     */
    select?: ProviderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProviderInclude<ExtArgs> | null
    /**
     * The filter to search for the Provider to update in case it exists.
     */
    where: ProviderWhereUniqueInput
    /**
     * In case the Provider found by the `where` argument doesn't exist, create a new Provider with this data.
     */
    create: XOR<ProviderCreateInput, ProviderUncheckedCreateInput>
    /**
     * In case the Provider was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProviderUpdateInput, ProviderUncheckedUpdateInput>
  }

  /**
   * Provider delete
   */
  export type ProviderDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Provider
     */
    select?: ProviderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProviderInclude<ExtArgs> | null
    /**
     * Filter which Provider to delete.
     */
    where: ProviderWhereUniqueInput
  }

  /**
   * Provider deleteMany
   */
  export type ProviderDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Providers to delete
     */
    where?: ProviderWhereInput
  }

  /**
   * Provider.items
   */
  export type Provider$itemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogItem
     */
    select?: CatalogItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogItemInclude<ExtArgs> | null
    where?: CatalogItemWhereInput
    orderBy?: CatalogItemOrderByWithRelationInput | CatalogItemOrderByWithRelationInput[]
    cursor?: CatalogItemWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CatalogItemScalarFieldEnum | CatalogItemScalarFieldEnum[]
  }

  /**
   * Provider.offers
   */
  export type Provider$offersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogOffer
     */
    select?: CatalogOfferSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogOfferInclude<ExtArgs> | null
    where?: CatalogOfferWhereInput
    orderBy?: CatalogOfferOrderByWithRelationInput | CatalogOfferOrderByWithRelationInput[]
    cursor?: CatalogOfferWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CatalogOfferScalarFieldEnum | CatalogOfferScalarFieldEnum[]
  }

  /**
   * Provider.orders
   */
  export type Provider$ordersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    where?: OrderWhereInput
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    cursor?: OrderWhereUniqueInput
    take?: number
    skip?: number
    distinct?: OrderScalarFieldEnum | OrderScalarFieldEnum[]
  }

  /**
   * Provider.blocks
   */
  export type Provider$blocksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfferBlock
     */
    select?: OfferBlockSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OfferBlockInclude<ExtArgs> | null
    where?: OfferBlockWhereInput
    orderBy?: OfferBlockOrderByWithRelationInput | OfferBlockOrderByWithRelationInput[]
    cursor?: OfferBlockWhereUniqueInput
    take?: number
    skip?: number
    distinct?: OfferBlockScalarFieldEnum | OfferBlockScalarFieldEnum[]
  }

  /**
   * Provider without action
   */
  export type ProviderDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Provider
     */
    select?: ProviderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProviderInclude<ExtArgs> | null
  }


  /**
   * Model CatalogItem
   */

  export type AggregateCatalogItem = {
    _count: CatalogItemCountAggregateOutputType | null
    _avg: CatalogItemAvgAggregateOutputType | null
    _sum: CatalogItemSumAggregateOutputType | null
    _min: CatalogItemMinAggregateOutputType | null
    _max: CatalogItemMaxAggregateOutputType | null
  }

  export type CatalogItemAvgAggregateOutputType = {
    availableQty: number | null
  }

  export type CatalogItemSumAggregateOutputType = {
    availableQty: number | null
  }

  export type CatalogItemMinAggregateOutputType = {
    id: string | null
    providerId: string | null
    sourceType: string | null
    deliveryMode: string | null
    availableQty: number | null
    meterId: string | null
    productionWindowsJson: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CatalogItemMaxAggregateOutputType = {
    id: string | null
    providerId: string | null
    sourceType: string | null
    deliveryMode: string | null
    availableQty: number | null
    meterId: string | null
    productionWindowsJson: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CatalogItemCountAggregateOutputType = {
    id: number
    providerId: number
    sourceType: number
    deliveryMode: number
    availableQty: number
    meterId: number
    productionWindowsJson: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type CatalogItemAvgAggregateInputType = {
    availableQty?: true
  }

  export type CatalogItemSumAggregateInputType = {
    availableQty?: true
  }

  export type CatalogItemMinAggregateInputType = {
    id?: true
    providerId?: true
    sourceType?: true
    deliveryMode?: true
    availableQty?: true
    meterId?: true
    productionWindowsJson?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CatalogItemMaxAggregateInputType = {
    id?: true
    providerId?: true
    sourceType?: true
    deliveryMode?: true
    availableQty?: true
    meterId?: true
    productionWindowsJson?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CatalogItemCountAggregateInputType = {
    id?: true
    providerId?: true
    sourceType?: true
    deliveryMode?: true
    availableQty?: true
    meterId?: true
    productionWindowsJson?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type CatalogItemAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CatalogItem to aggregate.
     */
    where?: CatalogItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CatalogItems to fetch.
     */
    orderBy?: CatalogItemOrderByWithRelationInput | CatalogItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CatalogItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CatalogItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CatalogItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CatalogItems
    **/
    _count?: true | CatalogItemCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CatalogItemAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CatalogItemSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CatalogItemMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CatalogItemMaxAggregateInputType
  }

  export type GetCatalogItemAggregateType<T extends CatalogItemAggregateArgs> = {
        [P in keyof T & keyof AggregateCatalogItem]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCatalogItem[P]>
      : GetScalarType<T[P], AggregateCatalogItem[P]>
  }




  export type CatalogItemGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CatalogItemWhereInput
    orderBy?: CatalogItemOrderByWithAggregationInput | CatalogItemOrderByWithAggregationInput[]
    by: CatalogItemScalarFieldEnum[] | CatalogItemScalarFieldEnum
    having?: CatalogItemScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CatalogItemCountAggregateInputType | true
    _avg?: CatalogItemAvgAggregateInputType
    _sum?: CatalogItemSumAggregateInputType
    _min?: CatalogItemMinAggregateInputType
    _max?: CatalogItemMaxAggregateInputType
  }

  export type CatalogItemGroupByOutputType = {
    id: string
    providerId: string
    sourceType: string
    deliveryMode: string
    availableQty: number
    meterId: string | null
    productionWindowsJson: string
    createdAt: Date
    updatedAt: Date
    _count: CatalogItemCountAggregateOutputType | null
    _avg: CatalogItemAvgAggregateOutputType | null
    _sum: CatalogItemSumAggregateOutputType | null
    _min: CatalogItemMinAggregateOutputType | null
    _max: CatalogItemMaxAggregateOutputType | null
  }

  type GetCatalogItemGroupByPayload<T extends CatalogItemGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CatalogItemGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CatalogItemGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CatalogItemGroupByOutputType[P]>
            : GetScalarType<T[P], CatalogItemGroupByOutputType[P]>
        }
      >
    >


  export type CatalogItemSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    providerId?: boolean
    sourceType?: boolean
    deliveryMode?: boolean
    availableQty?: boolean
    meterId?: boolean
    productionWindowsJson?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    provider?: boolean | ProviderDefaultArgs<ExtArgs>
    offers?: boolean | CatalogItem$offersArgs<ExtArgs>
    blocks?: boolean | CatalogItem$blocksArgs<ExtArgs>
    _count?: boolean | CatalogItemCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["catalogItem"]>

  export type CatalogItemSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    providerId?: boolean
    sourceType?: boolean
    deliveryMode?: boolean
    availableQty?: boolean
    meterId?: boolean
    productionWindowsJson?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    provider?: boolean | ProviderDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["catalogItem"]>

  export type CatalogItemSelectScalar = {
    id?: boolean
    providerId?: boolean
    sourceType?: boolean
    deliveryMode?: boolean
    availableQty?: boolean
    meterId?: boolean
    productionWindowsJson?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type CatalogItemInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    provider?: boolean | ProviderDefaultArgs<ExtArgs>
    offers?: boolean | CatalogItem$offersArgs<ExtArgs>
    blocks?: boolean | CatalogItem$blocksArgs<ExtArgs>
    _count?: boolean | CatalogItemCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type CatalogItemIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    provider?: boolean | ProviderDefaultArgs<ExtArgs>
  }

  export type $CatalogItemPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CatalogItem"
    objects: {
      provider: Prisma.$ProviderPayload<ExtArgs>
      offers: Prisma.$CatalogOfferPayload<ExtArgs>[]
      blocks: Prisma.$OfferBlockPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      providerId: string
      sourceType: string
      deliveryMode: string
      availableQty: number
      meterId: string | null
      productionWindowsJson: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["catalogItem"]>
    composites: {}
  }

  type CatalogItemGetPayload<S extends boolean | null | undefined | CatalogItemDefaultArgs> = $Result.GetResult<Prisma.$CatalogItemPayload, S>

  type CatalogItemCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<CatalogItemFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: CatalogItemCountAggregateInputType | true
    }

  export interface CatalogItemDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CatalogItem'], meta: { name: 'CatalogItem' } }
    /**
     * Find zero or one CatalogItem that matches the filter.
     * @param {CatalogItemFindUniqueArgs} args - Arguments to find a CatalogItem
     * @example
     * // Get one CatalogItem
     * const catalogItem = await prisma.catalogItem.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CatalogItemFindUniqueArgs>(args: SelectSubset<T, CatalogItemFindUniqueArgs<ExtArgs>>): Prisma__CatalogItemClient<$Result.GetResult<Prisma.$CatalogItemPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one CatalogItem that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {CatalogItemFindUniqueOrThrowArgs} args - Arguments to find a CatalogItem
     * @example
     * // Get one CatalogItem
     * const catalogItem = await prisma.catalogItem.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CatalogItemFindUniqueOrThrowArgs>(args: SelectSubset<T, CatalogItemFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CatalogItemClient<$Result.GetResult<Prisma.$CatalogItemPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first CatalogItem that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CatalogItemFindFirstArgs} args - Arguments to find a CatalogItem
     * @example
     * // Get one CatalogItem
     * const catalogItem = await prisma.catalogItem.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CatalogItemFindFirstArgs>(args?: SelectSubset<T, CatalogItemFindFirstArgs<ExtArgs>>): Prisma__CatalogItemClient<$Result.GetResult<Prisma.$CatalogItemPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first CatalogItem that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CatalogItemFindFirstOrThrowArgs} args - Arguments to find a CatalogItem
     * @example
     * // Get one CatalogItem
     * const catalogItem = await prisma.catalogItem.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CatalogItemFindFirstOrThrowArgs>(args?: SelectSubset<T, CatalogItemFindFirstOrThrowArgs<ExtArgs>>): Prisma__CatalogItemClient<$Result.GetResult<Prisma.$CatalogItemPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more CatalogItems that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CatalogItemFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CatalogItems
     * const catalogItems = await prisma.catalogItem.findMany()
     * 
     * // Get first 10 CatalogItems
     * const catalogItems = await prisma.catalogItem.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const catalogItemWithIdOnly = await prisma.catalogItem.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CatalogItemFindManyArgs>(args?: SelectSubset<T, CatalogItemFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CatalogItemPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a CatalogItem.
     * @param {CatalogItemCreateArgs} args - Arguments to create a CatalogItem.
     * @example
     * // Create one CatalogItem
     * const CatalogItem = await prisma.catalogItem.create({
     *   data: {
     *     // ... data to create a CatalogItem
     *   }
     * })
     * 
     */
    create<T extends CatalogItemCreateArgs>(args: SelectSubset<T, CatalogItemCreateArgs<ExtArgs>>): Prisma__CatalogItemClient<$Result.GetResult<Prisma.$CatalogItemPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many CatalogItems.
     * @param {CatalogItemCreateManyArgs} args - Arguments to create many CatalogItems.
     * @example
     * // Create many CatalogItems
     * const catalogItem = await prisma.catalogItem.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CatalogItemCreateManyArgs>(args?: SelectSubset<T, CatalogItemCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CatalogItems and returns the data saved in the database.
     * @param {CatalogItemCreateManyAndReturnArgs} args - Arguments to create many CatalogItems.
     * @example
     * // Create many CatalogItems
     * const catalogItem = await prisma.catalogItem.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CatalogItems and only return the `id`
     * const catalogItemWithIdOnly = await prisma.catalogItem.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CatalogItemCreateManyAndReturnArgs>(args?: SelectSubset<T, CatalogItemCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CatalogItemPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a CatalogItem.
     * @param {CatalogItemDeleteArgs} args - Arguments to delete one CatalogItem.
     * @example
     * // Delete one CatalogItem
     * const CatalogItem = await prisma.catalogItem.delete({
     *   where: {
     *     // ... filter to delete one CatalogItem
     *   }
     * })
     * 
     */
    delete<T extends CatalogItemDeleteArgs>(args: SelectSubset<T, CatalogItemDeleteArgs<ExtArgs>>): Prisma__CatalogItemClient<$Result.GetResult<Prisma.$CatalogItemPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one CatalogItem.
     * @param {CatalogItemUpdateArgs} args - Arguments to update one CatalogItem.
     * @example
     * // Update one CatalogItem
     * const catalogItem = await prisma.catalogItem.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CatalogItemUpdateArgs>(args: SelectSubset<T, CatalogItemUpdateArgs<ExtArgs>>): Prisma__CatalogItemClient<$Result.GetResult<Prisma.$CatalogItemPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more CatalogItems.
     * @param {CatalogItemDeleteManyArgs} args - Arguments to filter CatalogItems to delete.
     * @example
     * // Delete a few CatalogItems
     * const { count } = await prisma.catalogItem.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CatalogItemDeleteManyArgs>(args?: SelectSubset<T, CatalogItemDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CatalogItems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CatalogItemUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CatalogItems
     * const catalogItem = await prisma.catalogItem.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CatalogItemUpdateManyArgs>(args: SelectSubset<T, CatalogItemUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one CatalogItem.
     * @param {CatalogItemUpsertArgs} args - Arguments to update or create a CatalogItem.
     * @example
     * // Update or create a CatalogItem
     * const catalogItem = await prisma.catalogItem.upsert({
     *   create: {
     *     // ... data to create a CatalogItem
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CatalogItem we want to update
     *   }
     * })
     */
    upsert<T extends CatalogItemUpsertArgs>(args: SelectSubset<T, CatalogItemUpsertArgs<ExtArgs>>): Prisma__CatalogItemClient<$Result.GetResult<Prisma.$CatalogItemPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of CatalogItems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CatalogItemCountArgs} args - Arguments to filter CatalogItems to count.
     * @example
     * // Count the number of CatalogItems
     * const count = await prisma.catalogItem.count({
     *   where: {
     *     // ... the filter for the CatalogItems we want to count
     *   }
     * })
    **/
    count<T extends CatalogItemCountArgs>(
      args?: Subset<T, CatalogItemCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CatalogItemCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CatalogItem.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CatalogItemAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CatalogItemAggregateArgs>(args: Subset<T, CatalogItemAggregateArgs>): Prisma.PrismaPromise<GetCatalogItemAggregateType<T>>

    /**
     * Group by CatalogItem.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CatalogItemGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CatalogItemGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CatalogItemGroupByArgs['orderBy'] }
        : { orderBy?: CatalogItemGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CatalogItemGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCatalogItemGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CatalogItem model
   */
  readonly fields: CatalogItemFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CatalogItem.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CatalogItemClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    provider<T extends ProviderDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ProviderDefaultArgs<ExtArgs>>): Prisma__ProviderClient<$Result.GetResult<Prisma.$ProviderPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    offers<T extends CatalogItem$offersArgs<ExtArgs> = {}>(args?: Subset<T, CatalogItem$offersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CatalogOfferPayload<ExtArgs>, T, "findMany"> | Null>
    blocks<T extends CatalogItem$blocksArgs<ExtArgs> = {}>(args?: Subset<T, CatalogItem$blocksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OfferBlockPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the CatalogItem model
   */ 
  interface CatalogItemFieldRefs {
    readonly id: FieldRef<"CatalogItem", 'String'>
    readonly providerId: FieldRef<"CatalogItem", 'String'>
    readonly sourceType: FieldRef<"CatalogItem", 'String'>
    readonly deliveryMode: FieldRef<"CatalogItem", 'String'>
    readonly availableQty: FieldRef<"CatalogItem", 'Float'>
    readonly meterId: FieldRef<"CatalogItem", 'String'>
    readonly productionWindowsJson: FieldRef<"CatalogItem", 'String'>
    readonly createdAt: FieldRef<"CatalogItem", 'DateTime'>
    readonly updatedAt: FieldRef<"CatalogItem", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * CatalogItem findUnique
   */
  export type CatalogItemFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogItem
     */
    select?: CatalogItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogItemInclude<ExtArgs> | null
    /**
     * Filter, which CatalogItem to fetch.
     */
    where: CatalogItemWhereUniqueInput
  }

  /**
   * CatalogItem findUniqueOrThrow
   */
  export type CatalogItemFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogItem
     */
    select?: CatalogItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogItemInclude<ExtArgs> | null
    /**
     * Filter, which CatalogItem to fetch.
     */
    where: CatalogItemWhereUniqueInput
  }

  /**
   * CatalogItem findFirst
   */
  export type CatalogItemFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogItem
     */
    select?: CatalogItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogItemInclude<ExtArgs> | null
    /**
     * Filter, which CatalogItem to fetch.
     */
    where?: CatalogItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CatalogItems to fetch.
     */
    orderBy?: CatalogItemOrderByWithRelationInput | CatalogItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CatalogItems.
     */
    cursor?: CatalogItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CatalogItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CatalogItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CatalogItems.
     */
    distinct?: CatalogItemScalarFieldEnum | CatalogItemScalarFieldEnum[]
  }

  /**
   * CatalogItem findFirstOrThrow
   */
  export type CatalogItemFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogItem
     */
    select?: CatalogItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogItemInclude<ExtArgs> | null
    /**
     * Filter, which CatalogItem to fetch.
     */
    where?: CatalogItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CatalogItems to fetch.
     */
    orderBy?: CatalogItemOrderByWithRelationInput | CatalogItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CatalogItems.
     */
    cursor?: CatalogItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CatalogItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CatalogItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CatalogItems.
     */
    distinct?: CatalogItemScalarFieldEnum | CatalogItemScalarFieldEnum[]
  }

  /**
   * CatalogItem findMany
   */
  export type CatalogItemFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogItem
     */
    select?: CatalogItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogItemInclude<ExtArgs> | null
    /**
     * Filter, which CatalogItems to fetch.
     */
    where?: CatalogItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CatalogItems to fetch.
     */
    orderBy?: CatalogItemOrderByWithRelationInput | CatalogItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CatalogItems.
     */
    cursor?: CatalogItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CatalogItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CatalogItems.
     */
    skip?: number
    distinct?: CatalogItemScalarFieldEnum | CatalogItemScalarFieldEnum[]
  }

  /**
   * CatalogItem create
   */
  export type CatalogItemCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogItem
     */
    select?: CatalogItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogItemInclude<ExtArgs> | null
    /**
     * The data needed to create a CatalogItem.
     */
    data: XOR<CatalogItemCreateInput, CatalogItemUncheckedCreateInput>
  }

  /**
   * CatalogItem createMany
   */
  export type CatalogItemCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CatalogItems.
     */
    data: CatalogItemCreateManyInput | CatalogItemCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CatalogItem createManyAndReturn
   */
  export type CatalogItemCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogItem
     */
    select?: CatalogItemSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many CatalogItems.
     */
    data: CatalogItemCreateManyInput | CatalogItemCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogItemIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * CatalogItem update
   */
  export type CatalogItemUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogItem
     */
    select?: CatalogItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogItemInclude<ExtArgs> | null
    /**
     * The data needed to update a CatalogItem.
     */
    data: XOR<CatalogItemUpdateInput, CatalogItemUncheckedUpdateInput>
    /**
     * Choose, which CatalogItem to update.
     */
    where: CatalogItemWhereUniqueInput
  }

  /**
   * CatalogItem updateMany
   */
  export type CatalogItemUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CatalogItems.
     */
    data: XOR<CatalogItemUpdateManyMutationInput, CatalogItemUncheckedUpdateManyInput>
    /**
     * Filter which CatalogItems to update
     */
    where?: CatalogItemWhereInput
  }

  /**
   * CatalogItem upsert
   */
  export type CatalogItemUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogItem
     */
    select?: CatalogItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogItemInclude<ExtArgs> | null
    /**
     * The filter to search for the CatalogItem to update in case it exists.
     */
    where: CatalogItemWhereUniqueInput
    /**
     * In case the CatalogItem found by the `where` argument doesn't exist, create a new CatalogItem with this data.
     */
    create: XOR<CatalogItemCreateInput, CatalogItemUncheckedCreateInput>
    /**
     * In case the CatalogItem was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CatalogItemUpdateInput, CatalogItemUncheckedUpdateInput>
  }

  /**
   * CatalogItem delete
   */
  export type CatalogItemDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogItem
     */
    select?: CatalogItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogItemInclude<ExtArgs> | null
    /**
     * Filter which CatalogItem to delete.
     */
    where: CatalogItemWhereUniqueInput
  }

  /**
   * CatalogItem deleteMany
   */
  export type CatalogItemDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CatalogItems to delete
     */
    where?: CatalogItemWhereInput
  }

  /**
   * CatalogItem.offers
   */
  export type CatalogItem$offersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogOffer
     */
    select?: CatalogOfferSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogOfferInclude<ExtArgs> | null
    where?: CatalogOfferWhereInput
    orderBy?: CatalogOfferOrderByWithRelationInput | CatalogOfferOrderByWithRelationInput[]
    cursor?: CatalogOfferWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CatalogOfferScalarFieldEnum | CatalogOfferScalarFieldEnum[]
  }

  /**
   * CatalogItem.blocks
   */
  export type CatalogItem$blocksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfferBlock
     */
    select?: OfferBlockSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OfferBlockInclude<ExtArgs> | null
    where?: OfferBlockWhereInput
    orderBy?: OfferBlockOrderByWithRelationInput | OfferBlockOrderByWithRelationInput[]
    cursor?: OfferBlockWhereUniqueInput
    take?: number
    skip?: number
    distinct?: OfferBlockScalarFieldEnum | OfferBlockScalarFieldEnum[]
  }

  /**
   * CatalogItem without action
   */
  export type CatalogItemDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogItem
     */
    select?: CatalogItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogItemInclude<ExtArgs> | null
  }


  /**
   * Model CatalogOffer
   */

  export type AggregateCatalogOffer = {
    _count: CatalogOfferCountAggregateOutputType | null
    _avg: CatalogOfferAvgAggregateOutputType | null
    _sum: CatalogOfferSumAggregateOutputType | null
    _min: CatalogOfferMinAggregateOutputType | null
    _max: CatalogOfferMaxAggregateOutputType | null
  }

  export type CatalogOfferAvgAggregateOutputType = {
    priceValue: number | null
    maxQty: number | null
  }

  export type CatalogOfferSumAggregateOutputType = {
    priceValue: number | null
    maxQty: number | null
  }

  export type CatalogOfferMinAggregateOutputType = {
    id: string | null
    itemId: string | null
    providerId: string | null
    priceValue: number | null
    currency: string | null
    maxQty: number | null
    timeWindowStart: Date | null
    timeWindowEnd: Date | null
    pricingModel: string | null
    settlementType: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CatalogOfferMaxAggregateOutputType = {
    id: string | null
    itemId: string | null
    providerId: string | null
    priceValue: number | null
    currency: string | null
    maxQty: number | null
    timeWindowStart: Date | null
    timeWindowEnd: Date | null
    pricingModel: string | null
    settlementType: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CatalogOfferCountAggregateOutputType = {
    id: number
    itemId: number
    providerId: number
    priceValue: number
    currency: number
    maxQty: number
    timeWindowStart: number
    timeWindowEnd: number
    pricingModel: number
    settlementType: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type CatalogOfferAvgAggregateInputType = {
    priceValue?: true
    maxQty?: true
  }

  export type CatalogOfferSumAggregateInputType = {
    priceValue?: true
    maxQty?: true
  }

  export type CatalogOfferMinAggregateInputType = {
    id?: true
    itemId?: true
    providerId?: true
    priceValue?: true
    currency?: true
    maxQty?: true
    timeWindowStart?: true
    timeWindowEnd?: true
    pricingModel?: true
    settlementType?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CatalogOfferMaxAggregateInputType = {
    id?: true
    itemId?: true
    providerId?: true
    priceValue?: true
    currency?: true
    maxQty?: true
    timeWindowStart?: true
    timeWindowEnd?: true
    pricingModel?: true
    settlementType?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CatalogOfferCountAggregateInputType = {
    id?: true
    itemId?: true
    providerId?: true
    priceValue?: true
    currency?: true
    maxQty?: true
    timeWindowStart?: true
    timeWindowEnd?: true
    pricingModel?: true
    settlementType?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type CatalogOfferAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CatalogOffer to aggregate.
     */
    where?: CatalogOfferWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CatalogOffers to fetch.
     */
    orderBy?: CatalogOfferOrderByWithRelationInput | CatalogOfferOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CatalogOfferWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CatalogOffers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CatalogOffers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CatalogOffers
    **/
    _count?: true | CatalogOfferCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CatalogOfferAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CatalogOfferSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CatalogOfferMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CatalogOfferMaxAggregateInputType
  }

  export type GetCatalogOfferAggregateType<T extends CatalogOfferAggregateArgs> = {
        [P in keyof T & keyof AggregateCatalogOffer]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCatalogOffer[P]>
      : GetScalarType<T[P], AggregateCatalogOffer[P]>
  }




  export type CatalogOfferGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CatalogOfferWhereInput
    orderBy?: CatalogOfferOrderByWithAggregationInput | CatalogOfferOrderByWithAggregationInput[]
    by: CatalogOfferScalarFieldEnum[] | CatalogOfferScalarFieldEnum
    having?: CatalogOfferScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CatalogOfferCountAggregateInputType | true
    _avg?: CatalogOfferAvgAggregateInputType
    _sum?: CatalogOfferSumAggregateInputType
    _min?: CatalogOfferMinAggregateInputType
    _max?: CatalogOfferMaxAggregateInputType
  }

  export type CatalogOfferGroupByOutputType = {
    id: string
    itemId: string
    providerId: string
    priceValue: number
    currency: string
    maxQty: number
    timeWindowStart: Date
    timeWindowEnd: Date
    pricingModel: string
    settlementType: string
    createdAt: Date
    updatedAt: Date
    _count: CatalogOfferCountAggregateOutputType | null
    _avg: CatalogOfferAvgAggregateOutputType | null
    _sum: CatalogOfferSumAggregateOutputType | null
    _min: CatalogOfferMinAggregateOutputType | null
    _max: CatalogOfferMaxAggregateOutputType | null
  }

  type GetCatalogOfferGroupByPayload<T extends CatalogOfferGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CatalogOfferGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CatalogOfferGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CatalogOfferGroupByOutputType[P]>
            : GetScalarType<T[P], CatalogOfferGroupByOutputType[P]>
        }
      >
    >


  export type CatalogOfferSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    itemId?: boolean
    providerId?: boolean
    priceValue?: boolean
    currency?: boolean
    maxQty?: boolean
    timeWindowStart?: boolean
    timeWindowEnd?: boolean
    pricingModel?: boolean
    settlementType?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    item?: boolean | CatalogItemDefaultArgs<ExtArgs>
    provider?: boolean | ProviderDefaultArgs<ExtArgs>
    blocks?: boolean | CatalogOffer$blocksArgs<ExtArgs>
    orders?: boolean | CatalogOffer$ordersArgs<ExtArgs>
    _count?: boolean | CatalogOfferCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["catalogOffer"]>

  export type CatalogOfferSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    itemId?: boolean
    providerId?: boolean
    priceValue?: boolean
    currency?: boolean
    maxQty?: boolean
    timeWindowStart?: boolean
    timeWindowEnd?: boolean
    pricingModel?: boolean
    settlementType?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    item?: boolean | CatalogItemDefaultArgs<ExtArgs>
    provider?: boolean | ProviderDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["catalogOffer"]>

  export type CatalogOfferSelectScalar = {
    id?: boolean
    itemId?: boolean
    providerId?: boolean
    priceValue?: boolean
    currency?: boolean
    maxQty?: boolean
    timeWindowStart?: boolean
    timeWindowEnd?: boolean
    pricingModel?: boolean
    settlementType?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type CatalogOfferInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    item?: boolean | CatalogItemDefaultArgs<ExtArgs>
    provider?: boolean | ProviderDefaultArgs<ExtArgs>
    blocks?: boolean | CatalogOffer$blocksArgs<ExtArgs>
    orders?: boolean | CatalogOffer$ordersArgs<ExtArgs>
    _count?: boolean | CatalogOfferCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type CatalogOfferIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    item?: boolean | CatalogItemDefaultArgs<ExtArgs>
    provider?: boolean | ProviderDefaultArgs<ExtArgs>
  }

  export type $CatalogOfferPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CatalogOffer"
    objects: {
      item: Prisma.$CatalogItemPayload<ExtArgs>
      provider: Prisma.$ProviderPayload<ExtArgs>
      blocks: Prisma.$OfferBlockPayload<ExtArgs>[]
      orders: Prisma.$OrderPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      itemId: string
      providerId: string
      priceValue: number
      currency: string
      maxQty: number
      timeWindowStart: Date
      timeWindowEnd: Date
      pricingModel: string
      settlementType: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["catalogOffer"]>
    composites: {}
  }

  type CatalogOfferGetPayload<S extends boolean | null | undefined | CatalogOfferDefaultArgs> = $Result.GetResult<Prisma.$CatalogOfferPayload, S>

  type CatalogOfferCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<CatalogOfferFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: CatalogOfferCountAggregateInputType | true
    }

  export interface CatalogOfferDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CatalogOffer'], meta: { name: 'CatalogOffer' } }
    /**
     * Find zero or one CatalogOffer that matches the filter.
     * @param {CatalogOfferFindUniqueArgs} args - Arguments to find a CatalogOffer
     * @example
     * // Get one CatalogOffer
     * const catalogOffer = await prisma.catalogOffer.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CatalogOfferFindUniqueArgs>(args: SelectSubset<T, CatalogOfferFindUniqueArgs<ExtArgs>>): Prisma__CatalogOfferClient<$Result.GetResult<Prisma.$CatalogOfferPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one CatalogOffer that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {CatalogOfferFindUniqueOrThrowArgs} args - Arguments to find a CatalogOffer
     * @example
     * // Get one CatalogOffer
     * const catalogOffer = await prisma.catalogOffer.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CatalogOfferFindUniqueOrThrowArgs>(args: SelectSubset<T, CatalogOfferFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CatalogOfferClient<$Result.GetResult<Prisma.$CatalogOfferPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first CatalogOffer that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CatalogOfferFindFirstArgs} args - Arguments to find a CatalogOffer
     * @example
     * // Get one CatalogOffer
     * const catalogOffer = await prisma.catalogOffer.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CatalogOfferFindFirstArgs>(args?: SelectSubset<T, CatalogOfferFindFirstArgs<ExtArgs>>): Prisma__CatalogOfferClient<$Result.GetResult<Prisma.$CatalogOfferPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first CatalogOffer that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CatalogOfferFindFirstOrThrowArgs} args - Arguments to find a CatalogOffer
     * @example
     * // Get one CatalogOffer
     * const catalogOffer = await prisma.catalogOffer.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CatalogOfferFindFirstOrThrowArgs>(args?: SelectSubset<T, CatalogOfferFindFirstOrThrowArgs<ExtArgs>>): Prisma__CatalogOfferClient<$Result.GetResult<Prisma.$CatalogOfferPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more CatalogOffers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CatalogOfferFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CatalogOffers
     * const catalogOffers = await prisma.catalogOffer.findMany()
     * 
     * // Get first 10 CatalogOffers
     * const catalogOffers = await prisma.catalogOffer.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const catalogOfferWithIdOnly = await prisma.catalogOffer.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CatalogOfferFindManyArgs>(args?: SelectSubset<T, CatalogOfferFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CatalogOfferPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a CatalogOffer.
     * @param {CatalogOfferCreateArgs} args - Arguments to create a CatalogOffer.
     * @example
     * // Create one CatalogOffer
     * const CatalogOffer = await prisma.catalogOffer.create({
     *   data: {
     *     // ... data to create a CatalogOffer
     *   }
     * })
     * 
     */
    create<T extends CatalogOfferCreateArgs>(args: SelectSubset<T, CatalogOfferCreateArgs<ExtArgs>>): Prisma__CatalogOfferClient<$Result.GetResult<Prisma.$CatalogOfferPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many CatalogOffers.
     * @param {CatalogOfferCreateManyArgs} args - Arguments to create many CatalogOffers.
     * @example
     * // Create many CatalogOffers
     * const catalogOffer = await prisma.catalogOffer.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CatalogOfferCreateManyArgs>(args?: SelectSubset<T, CatalogOfferCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CatalogOffers and returns the data saved in the database.
     * @param {CatalogOfferCreateManyAndReturnArgs} args - Arguments to create many CatalogOffers.
     * @example
     * // Create many CatalogOffers
     * const catalogOffer = await prisma.catalogOffer.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CatalogOffers and only return the `id`
     * const catalogOfferWithIdOnly = await prisma.catalogOffer.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CatalogOfferCreateManyAndReturnArgs>(args?: SelectSubset<T, CatalogOfferCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CatalogOfferPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a CatalogOffer.
     * @param {CatalogOfferDeleteArgs} args - Arguments to delete one CatalogOffer.
     * @example
     * // Delete one CatalogOffer
     * const CatalogOffer = await prisma.catalogOffer.delete({
     *   where: {
     *     // ... filter to delete one CatalogOffer
     *   }
     * })
     * 
     */
    delete<T extends CatalogOfferDeleteArgs>(args: SelectSubset<T, CatalogOfferDeleteArgs<ExtArgs>>): Prisma__CatalogOfferClient<$Result.GetResult<Prisma.$CatalogOfferPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one CatalogOffer.
     * @param {CatalogOfferUpdateArgs} args - Arguments to update one CatalogOffer.
     * @example
     * // Update one CatalogOffer
     * const catalogOffer = await prisma.catalogOffer.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CatalogOfferUpdateArgs>(args: SelectSubset<T, CatalogOfferUpdateArgs<ExtArgs>>): Prisma__CatalogOfferClient<$Result.GetResult<Prisma.$CatalogOfferPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more CatalogOffers.
     * @param {CatalogOfferDeleteManyArgs} args - Arguments to filter CatalogOffers to delete.
     * @example
     * // Delete a few CatalogOffers
     * const { count } = await prisma.catalogOffer.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CatalogOfferDeleteManyArgs>(args?: SelectSubset<T, CatalogOfferDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CatalogOffers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CatalogOfferUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CatalogOffers
     * const catalogOffer = await prisma.catalogOffer.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CatalogOfferUpdateManyArgs>(args: SelectSubset<T, CatalogOfferUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one CatalogOffer.
     * @param {CatalogOfferUpsertArgs} args - Arguments to update or create a CatalogOffer.
     * @example
     * // Update or create a CatalogOffer
     * const catalogOffer = await prisma.catalogOffer.upsert({
     *   create: {
     *     // ... data to create a CatalogOffer
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CatalogOffer we want to update
     *   }
     * })
     */
    upsert<T extends CatalogOfferUpsertArgs>(args: SelectSubset<T, CatalogOfferUpsertArgs<ExtArgs>>): Prisma__CatalogOfferClient<$Result.GetResult<Prisma.$CatalogOfferPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of CatalogOffers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CatalogOfferCountArgs} args - Arguments to filter CatalogOffers to count.
     * @example
     * // Count the number of CatalogOffers
     * const count = await prisma.catalogOffer.count({
     *   where: {
     *     // ... the filter for the CatalogOffers we want to count
     *   }
     * })
    **/
    count<T extends CatalogOfferCountArgs>(
      args?: Subset<T, CatalogOfferCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CatalogOfferCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CatalogOffer.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CatalogOfferAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CatalogOfferAggregateArgs>(args: Subset<T, CatalogOfferAggregateArgs>): Prisma.PrismaPromise<GetCatalogOfferAggregateType<T>>

    /**
     * Group by CatalogOffer.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CatalogOfferGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CatalogOfferGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CatalogOfferGroupByArgs['orderBy'] }
        : { orderBy?: CatalogOfferGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CatalogOfferGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCatalogOfferGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CatalogOffer model
   */
  readonly fields: CatalogOfferFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CatalogOffer.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CatalogOfferClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    item<T extends CatalogItemDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CatalogItemDefaultArgs<ExtArgs>>): Prisma__CatalogItemClient<$Result.GetResult<Prisma.$CatalogItemPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    provider<T extends ProviderDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ProviderDefaultArgs<ExtArgs>>): Prisma__ProviderClient<$Result.GetResult<Prisma.$ProviderPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    blocks<T extends CatalogOffer$blocksArgs<ExtArgs> = {}>(args?: Subset<T, CatalogOffer$blocksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OfferBlockPayload<ExtArgs>, T, "findMany"> | Null>
    orders<T extends CatalogOffer$ordersArgs<ExtArgs> = {}>(args?: Subset<T, CatalogOffer$ordersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the CatalogOffer model
   */ 
  interface CatalogOfferFieldRefs {
    readonly id: FieldRef<"CatalogOffer", 'String'>
    readonly itemId: FieldRef<"CatalogOffer", 'String'>
    readonly providerId: FieldRef<"CatalogOffer", 'String'>
    readonly priceValue: FieldRef<"CatalogOffer", 'Float'>
    readonly currency: FieldRef<"CatalogOffer", 'String'>
    readonly maxQty: FieldRef<"CatalogOffer", 'Float'>
    readonly timeWindowStart: FieldRef<"CatalogOffer", 'DateTime'>
    readonly timeWindowEnd: FieldRef<"CatalogOffer", 'DateTime'>
    readonly pricingModel: FieldRef<"CatalogOffer", 'String'>
    readonly settlementType: FieldRef<"CatalogOffer", 'String'>
    readonly createdAt: FieldRef<"CatalogOffer", 'DateTime'>
    readonly updatedAt: FieldRef<"CatalogOffer", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * CatalogOffer findUnique
   */
  export type CatalogOfferFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogOffer
     */
    select?: CatalogOfferSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogOfferInclude<ExtArgs> | null
    /**
     * Filter, which CatalogOffer to fetch.
     */
    where: CatalogOfferWhereUniqueInput
  }

  /**
   * CatalogOffer findUniqueOrThrow
   */
  export type CatalogOfferFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogOffer
     */
    select?: CatalogOfferSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogOfferInclude<ExtArgs> | null
    /**
     * Filter, which CatalogOffer to fetch.
     */
    where: CatalogOfferWhereUniqueInput
  }

  /**
   * CatalogOffer findFirst
   */
  export type CatalogOfferFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogOffer
     */
    select?: CatalogOfferSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogOfferInclude<ExtArgs> | null
    /**
     * Filter, which CatalogOffer to fetch.
     */
    where?: CatalogOfferWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CatalogOffers to fetch.
     */
    orderBy?: CatalogOfferOrderByWithRelationInput | CatalogOfferOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CatalogOffers.
     */
    cursor?: CatalogOfferWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CatalogOffers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CatalogOffers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CatalogOffers.
     */
    distinct?: CatalogOfferScalarFieldEnum | CatalogOfferScalarFieldEnum[]
  }

  /**
   * CatalogOffer findFirstOrThrow
   */
  export type CatalogOfferFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogOffer
     */
    select?: CatalogOfferSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogOfferInclude<ExtArgs> | null
    /**
     * Filter, which CatalogOffer to fetch.
     */
    where?: CatalogOfferWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CatalogOffers to fetch.
     */
    orderBy?: CatalogOfferOrderByWithRelationInput | CatalogOfferOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CatalogOffers.
     */
    cursor?: CatalogOfferWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CatalogOffers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CatalogOffers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CatalogOffers.
     */
    distinct?: CatalogOfferScalarFieldEnum | CatalogOfferScalarFieldEnum[]
  }

  /**
   * CatalogOffer findMany
   */
  export type CatalogOfferFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogOffer
     */
    select?: CatalogOfferSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogOfferInclude<ExtArgs> | null
    /**
     * Filter, which CatalogOffers to fetch.
     */
    where?: CatalogOfferWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CatalogOffers to fetch.
     */
    orderBy?: CatalogOfferOrderByWithRelationInput | CatalogOfferOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CatalogOffers.
     */
    cursor?: CatalogOfferWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CatalogOffers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CatalogOffers.
     */
    skip?: number
    distinct?: CatalogOfferScalarFieldEnum | CatalogOfferScalarFieldEnum[]
  }

  /**
   * CatalogOffer create
   */
  export type CatalogOfferCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogOffer
     */
    select?: CatalogOfferSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogOfferInclude<ExtArgs> | null
    /**
     * The data needed to create a CatalogOffer.
     */
    data: XOR<CatalogOfferCreateInput, CatalogOfferUncheckedCreateInput>
  }

  /**
   * CatalogOffer createMany
   */
  export type CatalogOfferCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CatalogOffers.
     */
    data: CatalogOfferCreateManyInput | CatalogOfferCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CatalogOffer createManyAndReturn
   */
  export type CatalogOfferCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogOffer
     */
    select?: CatalogOfferSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many CatalogOffers.
     */
    data: CatalogOfferCreateManyInput | CatalogOfferCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogOfferIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * CatalogOffer update
   */
  export type CatalogOfferUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogOffer
     */
    select?: CatalogOfferSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogOfferInclude<ExtArgs> | null
    /**
     * The data needed to update a CatalogOffer.
     */
    data: XOR<CatalogOfferUpdateInput, CatalogOfferUncheckedUpdateInput>
    /**
     * Choose, which CatalogOffer to update.
     */
    where: CatalogOfferWhereUniqueInput
  }

  /**
   * CatalogOffer updateMany
   */
  export type CatalogOfferUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CatalogOffers.
     */
    data: XOR<CatalogOfferUpdateManyMutationInput, CatalogOfferUncheckedUpdateManyInput>
    /**
     * Filter which CatalogOffers to update
     */
    where?: CatalogOfferWhereInput
  }

  /**
   * CatalogOffer upsert
   */
  export type CatalogOfferUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogOffer
     */
    select?: CatalogOfferSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogOfferInclude<ExtArgs> | null
    /**
     * The filter to search for the CatalogOffer to update in case it exists.
     */
    where: CatalogOfferWhereUniqueInput
    /**
     * In case the CatalogOffer found by the `where` argument doesn't exist, create a new CatalogOffer with this data.
     */
    create: XOR<CatalogOfferCreateInput, CatalogOfferUncheckedCreateInput>
    /**
     * In case the CatalogOffer was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CatalogOfferUpdateInput, CatalogOfferUncheckedUpdateInput>
  }

  /**
   * CatalogOffer delete
   */
  export type CatalogOfferDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogOffer
     */
    select?: CatalogOfferSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogOfferInclude<ExtArgs> | null
    /**
     * Filter which CatalogOffer to delete.
     */
    where: CatalogOfferWhereUniqueInput
  }

  /**
   * CatalogOffer deleteMany
   */
  export type CatalogOfferDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CatalogOffers to delete
     */
    where?: CatalogOfferWhereInput
  }

  /**
   * CatalogOffer.blocks
   */
  export type CatalogOffer$blocksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfferBlock
     */
    select?: OfferBlockSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OfferBlockInclude<ExtArgs> | null
    where?: OfferBlockWhereInput
    orderBy?: OfferBlockOrderByWithRelationInput | OfferBlockOrderByWithRelationInput[]
    cursor?: OfferBlockWhereUniqueInput
    take?: number
    skip?: number
    distinct?: OfferBlockScalarFieldEnum | OfferBlockScalarFieldEnum[]
  }

  /**
   * CatalogOffer.orders
   */
  export type CatalogOffer$ordersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    where?: OrderWhereInput
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    cursor?: OrderWhereUniqueInput
    take?: number
    skip?: number
    distinct?: OrderScalarFieldEnum | OrderScalarFieldEnum[]
  }

  /**
   * CatalogOffer without action
   */
  export type CatalogOfferDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogOffer
     */
    select?: CatalogOfferSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogOfferInclude<ExtArgs> | null
  }


  /**
   * Model OfferBlock
   */

  export type AggregateOfferBlock = {
    _count: OfferBlockCountAggregateOutputType | null
    _avg: OfferBlockAvgAggregateOutputType | null
    _sum: OfferBlockSumAggregateOutputType | null
    _min: OfferBlockMinAggregateOutputType | null
    _max: OfferBlockMaxAggregateOutputType | null
  }

  export type OfferBlockAvgAggregateOutputType = {
    priceValue: number | null
  }

  export type OfferBlockSumAggregateOutputType = {
    priceValue: number | null
  }

  export type OfferBlockMinAggregateOutputType = {
    id: string | null
    offerId: string | null
    itemId: string | null
    providerId: string | null
    status: string | null
    orderId: string | null
    transactionId: string | null
    priceValue: number | null
    currency: string | null
    createdAt: Date | null
    updatedAt: Date | null
    reservedAt: Date | null
    soldAt: Date | null
  }

  export type OfferBlockMaxAggregateOutputType = {
    id: string | null
    offerId: string | null
    itemId: string | null
    providerId: string | null
    status: string | null
    orderId: string | null
    transactionId: string | null
    priceValue: number | null
    currency: string | null
    createdAt: Date | null
    updatedAt: Date | null
    reservedAt: Date | null
    soldAt: Date | null
  }

  export type OfferBlockCountAggregateOutputType = {
    id: number
    offerId: number
    itemId: number
    providerId: number
    status: number
    orderId: number
    transactionId: number
    priceValue: number
    currency: number
    createdAt: number
    updatedAt: number
    reservedAt: number
    soldAt: number
    _all: number
  }


  export type OfferBlockAvgAggregateInputType = {
    priceValue?: true
  }

  export type OfferBlockSumAggregateInputType = {
    priceValue?: true
  }

  export type OfferBlockMinAggregateInputType = {
    id?: true
    offerId?: true
    itemId?: true
    providerId?: true
    status?: true
    orderId?: true
    transactionId?: true
    priceValue?: true
    currency?: true
    createdAt?: true
    updatedAt?: true
    reservedAt?: true
    soldAt?: true
  }

  export type OfferBlockMaxAggregateInputType = {
    id?: true
    offerId?: true
    itemId?: true
    providerId?: true
    status?: true
    orderId?: true
    transactionId?: true
    priceValue?: true
    currency?: true
    createdAt?: true
    updatedAt?: true
    reservedAt?: true
    soldAt?: true
  }

  export type OfferBlockCountAggregateInputType = {
    id?: true
    offerId?: true
    itemId?: true
    providerId?: true
    status?: true
    orderId?: true
    transactionId?: true
    priceValue?: true
    currency?: true
    createdAt?: true
    updatedAt?: true
    reservedAt?: true
    soldAt?: true
    _all?: true
  }

  export type OfferBlockAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OfferBlock to aggregate.
     */
    where?: OfferBlockWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OfferBlocks to fetch.
     */
    orderBy?: OfferBlockOrderByWithRelationInput | OfferBlockOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OfferBlockWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OfferBlocks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OfferBlocks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned OfferBlocks
    **/
    _count?: true | OfferBlockCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: OfferBlockAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: OfferBlockSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OfferBlockMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OfferBlockMaxAggregateInputType
  }

  export type GetOfferBlockAggregateType<T extends OfferBlockAggregateArgs> = {
        [P in keyof T & keyof AggregateOfferBlock]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOfferBlock[P]>
      : GetScalarType<T[P], AggregateOfferBlock[P]>
  }




  export type OfferBlockGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OfferBlockWhereInput
    orderBy?: OfferBlockOrderByWithAggregationInput | OfferBlockOrderByWithAggregationInput[]
    by: OfferBlockScalarFieldEnum[] | OfferBlockScalarFieldEnum
    having?: OfferBlockScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OfferBlockCountAggregateInputType | true
    _avg?: OfferBlockAvgAggregateInputType
    _sum?: OfferBlockSumAggregateInputType
    _min?: OfferBlockMinAggregateInputType
    _max?: OfferBlockMaxAggregateInputType
  }

  export type OfferBlockGroupByOutputType = {
    id: string
    offerId: string
    itemId: string
    providerId: string
    status: string
    orderId: string | null
    transactionId: string | null
    priceValue: number
    currency: string
    createdAt: Date
    updatedAt: Date
    reservedAt: Date | null
    soldAt: Date | null
    _count: OfferBlockCountAggregateOutputType | null
    _avg: OfferBlockAvgAggregateOutputType | null
    _sum: OfferBlockSumAggregateOutputType | null
    _min: OfferBlockMinAggregateOutputType | null
    _max: OfferBlockMaxAggregateOutputType | null
  }

  type GetOfferBlockGroupByPayload<T extends OfferBlockGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OfferBlockGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OfferBlockGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OfferBlockGroupByOutputType[P]>
            : GetScalarType<T[P], OfferBlockGroupByOutputType[P]>
        }
      >
    >


  export type OfferBlockSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    offerId?: boolean
    itemId?: boolean
    providerId?: boolean
    status?: boolean
    orderId?: boolean
    transactionId?: boolean
    priceValue?: boolean
    currency?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    reservedAt?: boolean
    soldAt?: boolean
    offer?: boolean | CatalogOfferDefaultArgs<ExtArgs>
    item?: boolean | CatalogItemDefaultArgs<ExtArgs>
    provider?: boolean | ProviderDefaultArgs<ExtArgs>
    order?: boolean | OfferBlock$orderArgs<ExtArgs>
  }, ExtArgs["result"]["offerBlock"]>

  export type OfferBlockSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    offerId?: boolean
    itemId?: boolean
    providerId?: boolean
    status?: boolean
    orderId?: boolean
    transactionId?: boolean
    priceValue?: boolean
    currency?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    reservedAt?: boolean
    soldAt?: boolean
    offer?: boolean | CatalogOfferDefaultArgs<ExtArgs>
    item?: boolean | CatalogItemDefaultArgs<ExtArgs>
    provider?: boolean | ProviderDefaultArgs<ExtArgs>
    order?: boolean | OfferBlock$orderArgs<ExtArgs>
  }, ExtArgs["result"]["offerBlock"]>

  export type OfferBlockSelectScalar = {
    id?: boolean
    offerId?: boolean
    itemId?: boolean
    providerId?: boolean
    status?: boolean
    orderId?: boolean
    transactionId?: boolean
    priceValue?: boolean
    currency?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    reservedAt?: boolean
    soldAt?: boolean
  }

  export type OfferBlockInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    offer?: boolean | CatalogOfferDefaultArgs<ExtArgs>
    item?: boolean | CatalogItemDefaultArgs<ExtArgs>
    provider?: boolean | ProviderDefaultArgs<ExtArgs>
    order?: boolean | OfferBlock$orderArgs<ExtArgs>
  }
  export type OfferBlockIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    offer?: boolean | CatalogOfferDefaultArgs<ExtArgs>
    item?: boolean | CatalogItemDefaultArgs<ExtArgs>
    provider?: boolean | ProviderDefaultArgs<ExtArgs>
    order?: boolean | OfferBlock$orderArgs<ExtArgs>
  }

  export type $OfferBlockPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "OfferBlock"
    objects: {
      offer: Prisma.$CatalogOfferPayload<ExtArgs>
      item: Prisma.$CatalogItemPayload<ExtArgs>
      provider: Prisma.$ProviderPayload<ExtArgs>
      order: Prisma.$OrderPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      offerId: string
      itemId: string
      providerId: string
      status: string
      orderId: string | null
      transactionId: string | null
      priceValue: number
      currency: string
      createdAt: Date
      updatedAt: Date
      reservedAt: Date | null
      soldAt: Date | null
    }, ExtArgs["result"]["offerBlock"]>
    composites: {}
  }

  type OfferBlockGetPayload<S extends boolean | null | undefined | OfferBlockDefaultArgs> = $Result.GetResult<Prisma.$OfferBlockPayload, S>

  type OfferBlockCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<OfferBlockFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: OfferBlockCountAggregateInputType | true
    }

  export interface OfferBlockDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['OfferBlock'], meta: { name: 'OfferBlock' } }
    /**
     * Find zero or one OfferBlock that matches the filter.
     * @param {OfferBlockFindUniqueArgs} args - Arguments to find a OfferBlock
     * @example
     * // Get one OfferBlock
     * const offerBlock = await prisma.offerBlock.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends OfferBlockFindUniqueArgs>(args: SelectSubset<T, OfferBlockFindUniqueArgs<ExtArgs>>): Prisma__OfferBlockClient<$Result.GetResult<Prisma.$OfferBlockPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one OfferBlock that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {OfferBlockFindUniqueOrThrowArgs} args - Arguments to find a OfferBlock
     * @example
     * // Get one OfferBlock
     * const offerBlock = await prisma.offerBlock.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends OfferBlockFindUniqueOrThrowArgs>(args: SelectSubset<T, OfferBlockFindUniqueOrThrowArgs<ExtArgs>>): Prisma__OfferBlockClient<$Result.GetResult<Prisma.$OfferBlockPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first OfferBlock that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OfferBlockFindFirstArgs} args - Arguments to find a OfferBlock
     * @example
     * // Get one OfferBlock
     * const offerBlock = await prisma.offerBlock.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends OfferBlockFindFirstArgs>(args?: SelectSubset<T, OfferBlockFindFirstArgs<ExtArgs>>): Prisma__OfferBlockClient<$Result.GetResult<Prisma.$OfferBlockPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first OfferBlock that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OfferBlockFindFirstOrThrowArgs} args - Arguments to find a OfferBlock
     * @example
     * // Get one OfferBlock
     * const offerBlock = await prisma.offerBlock.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends OfferBlockFindFirstOrThrowArgs>(args?: SelectSubset<T, OfferBlockFindFirstOrThrowArgs<ExtArgs>>): Prisma__OfferBlockClient<$Result.GetResult<Prisma.$OfferBlockPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more OfferBlocks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OfferBlockFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all OfferBlocks
     * const offerBlocks = await prisma.offerBlock.findMany()
     * 
     * // Get first 10 OfferBlocks
     * const offerBlocks = await prisma.offerBlock.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const offerBlockWithIdOnly = await prisma.offerBlock.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends OfferBlockFindManyArgs>(args?: SelectSubset<T, OfferBlockFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OfferBlockPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a OfferBlock.
     * @param {OfferBlockCreateArgs} args - Arguments to create a OfferBlock.
     * @example
     * // Create one OfferBlock
     * const OfferBlock = await prisma.offerBlock.create({
     *   data: {
     *     // ... data to create a OfferBlock
     *   }
     * })
     * 
     */
    create<T extends OfferBlockCreateArgs>(args: SelectSubset<T, OfferBlockCreateArgs<ExtArgs>>): Prisma__OfferBlockClient<$Result.GetResult<Prisma.$OfferBlockPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many OfferBlocks.
     * @param {OfferBlockCreateManyArgs} args - Arguments to create many OfferBlocks.
     * @example
     * // Create many OfferBlocks
     * const offerBlock = await prisma.offerBlock.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends OfferBlockCreateManyArgs>(args?: SelectSubset<T, OfferBlockCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many OfferBlocks and returns the data saved in the database.
     * @param {OfferBlockCreateManyAndReturnArgs} args - Arguments to create many OfferBlocks.
     * @example
     * // Create many OfferBlocks
     * const offerBlock = await prisma.offerBlock.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many OfferBlocks and only return the `id`
     * const offerBlockWithIdOnly = await prisma.offerBlock.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends OfferBlockCreateManyAndReturnArgs>(args?: SelectSubset<T, OfferBlockCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OfferBlockPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a OfferBlock.
     * @param {OfferBlockDeleteArgs} args - Arguments to delete one OfferBlock.
     * @example
     * // Delete one OfferBlock
     * const OfferBlock = await prisma.offerBlock.delete({
     *   where: {
     *     // ... filter to delete one OfferBlock
     *   }
     * })
     * 
     */
    delete<T extends OfferBlockDeleteArgs>(args: SelectSubset<T, OfferBlockDeleteArgs<ExtArgs>>): Prisma__OfferBlockClient<$Result.GetResult<Prisma.$OfferBlockPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one OfferBlock.
     * @param {OfferBlockUpdateArgs} args - Arguments to update one OfferBlock.
     * @example
     * // Update one OfferBlock
     * const offerBlock = await prisma.offerBlock.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends OfferBlockUpdateArgs>(args: SelectSubset<T, OfferBlockUpdateArgs<ExtArgs>>): Prisma__OfferBlockClient<$Result.GetResult<Prisma.$OfferBlockPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more OfferBlocks.
     * @param {OfferBlockDeleteManyArgs} args - Arguments to filter OfferBlocks to delete.
     * @example
     * // Delete a few OfferBlocks
     * const { count } = await prisma.offerBlock.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends OfferBlockDeleteManyArgs>(args?: SelectSubset<T, OfferBlockDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more OfferBlocks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OfferBlockUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many OfferBlocks
     * const offerBlock = await prisma.offerBlock.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends OfferBlockUpdateManyArgs>(args: SelectSubset<T, OfferBlockUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one OfferBlock.
     * @param {OfferBlockUpsertArgs} args - Arguments to update or create a OfferBlock.
     * @example
     * // Update or create a OfferBlock
     * const offerBlock = await prisma.offerBlock.upsert({
     *   create: {
     *     // ... data to create a OfferBlock
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the OfferBlock we want to update
     *   }
     * })
     */
    upsert<T extends OfferBlockUpsertArgs>(args: SelectSubset<T, OfferBlockUpsertArgs<ExtArgs>>): Prisma__OfferBlockClient<$Result.GetResult<Prisma.$OfferBlockPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of OfferBlocks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OfferBlockCountArgs} args - Arguments to filter OfferBlocks to count.
     * @example
     * // Count the number of OfferBlocks
     * const count = await prisma.offerBlock.count({
     *   where: {
     *     // ... the filter for the OfferBlocks we want to count
     *   }
     * })
    **/
    count<T extends OfferBlockCountArgs>(
      args?: Subset<T, OfferBlockCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OfferBlockCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a OfferBlock.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OfferBlockAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OfferBlockAggregateArgs>(args: Subset<T, OfferBlockAggregateArgs>): Prisma.PrismaPromise<GetOfferBlockAggregateType<T>>

    /**
     * Group by OfferBlock.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OfferBlockGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OfferBlockGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OfferBlockGroupByArgs['orderBy'] }
        : { orderBy?: OfferBlockGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OfferBlockGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOfferBlockGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the OfferBlock model
   */
  readonly fields: OfferBlockFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for OfferBlock.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OfferBlockClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    offer<T extends CatalogOfferDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CatalogOfferDefaultArgs<ExtArgs>>): Prisma__CatalogOfferClient<$Result.GetResult<Prisma.$CatalogOfferPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    item<T extends CatalogItemDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CatalogItemDefaultArgs<ExtArgs>>): Prisma__CatalogItemClient<$Result.GetResult<Prisma.$CatalogItemPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    provider<T extends ProviderDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ProviderDefaultArgs<ExtArgs>>): Prisma__ProviderClient<$Result.GetResult<Prisma.$ProviderPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    order<T extends OfferBlock$orderArgs<ExtArgs> = {}>(args?: Subset<T, OfferBlock$orderArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the OfferBlock model
   */ 
  interface OfferBlockFieldRefs {
    readonly id: FieldRef<"OfferBlock", 'String'>
    readonly offerId: FieldRef<"OfferBlock", 'String'>
    readonly itemId: FieldRef<"OfferBlock", 'String'>
    readonly providerId: FieldRef<"OfferBlock", 'String'>
    readonly status: FieldRef<"OfferBlock", 'String'>
    readonly orderId: FieldRef<"OfferBlock", 'String'>
    readonly transactionId: FieldRef<"OfferBlock", 'String'>
    readonly priceValue: FieldRef<"OfferBlock", 'Float'>
    readonly currency: FieldRef<"OfferBlock", 'String'>
    readonly createdAt: FieldRef<"OfferBlock", 'DateTime'>
    readonly updatedAt: FieldRef<"OfferBlock", 'DateTime'>
    readonly reservedAt: FieldRef<"OfferBlock", 'DateTime'>
    readonly soldAt: FieldRef<"OfferBlock", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * OfferBlock findUnique
   */
  export type OfferBlockFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfferBlock
     */
    select?: OfferBlockSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OfferBlockInclude<ExtArgs> | null
    /**
     * Filter, which OfferBlock to fetch.
     */
    where: OfferBlockWhereUniqueInput
  }

  /**
   * OfferBlock findUniqueOrThrow
   */
  export type OfferBlockFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfferBlock
     */
    select?: OfferBlockSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OfferBlockInclude<ExtArgs> | null
    /**
     * Filter, which OfferBlock to fetch.
     */
    where: OfferBlockWhereUniqueInput
  }

  /**
   * OfferBlock findFirst
   */
  export type OfferBlockFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfferBlock
     */
    select?: OfferBlockSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OfferBlockInclude<ExtArgs> | null
    /**
     * Filter, which OfferBlock to fetch.
     */
    where?: OfferBlockWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OfferBlocks to fetch.
     */
    orderBy?: OfferBlockOrderByWithRelationInput | OfferBlockOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OfferBlocks.
     */
    cursor?: OfferBlockWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OfferBlocks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OfferBlocks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OfferBlocks.
     */
    distinct?: OfferBlockScalarFieldEnum | OfferBlockScalarFieldEnum[]
  }

  /**
   * OfferBlock findFirstOrThrow
   */
  export type OfferBlockFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfferBlock
     */
    select?: OfferBlockSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OfferBlockInclude<ExtArgs> | null
    /**
     * Filter, which OfferBlock to fetch.
     */
    where?: OfferBlockWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OfferBlocks to fetch.
     */
    orderBy?: OfferBlockOrderByWithRelationInput | OfferBlockOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OfferBlocks.
     */
    cursor?: OfferBlockWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OfferBlocks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OfferBlocks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OfferBlocks.
     */
    distinct?: OfferBlockScalarFieldEnum | OfferBlockScalarFieldEnum[]
  }

  /**
   * OfferBlock findMany
   */
  export type OfferBlockFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfferBlock
     */
    select?: OfferBlockSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OfferBlockInclude<ExtArgs> | null
    /**
     * Filter, which OfferBlocks to fetch.
     */
    where?: OfferBlockWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OfferBlocks to fetch.
     */
    orderBy?: OfferBlockOrderByWithRelationInput | OfferBlockOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing OfferBlocks.
     */
    cursor?: OfferBlockWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OfferBlocks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OfferBlocks.
     */
    skip?: number
    distinct?: OfferBlockScalarFieldEnum | OfferBlockScalarFieldEnum[]
  }

  /**
   * OfferBlock create
   */
  export type OfferBlockCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfferBlock
     */
    select?: OfferBlockSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OfferBlockInclude<ExtArgs> | null
    /**
     * The data needed to create a OfferBlock.
     */
    data: XOR<OfferBlockCreateInput, OfferBlockUncheckedCreateInput>
  }

  /**
   * OfferBlock createMany
   */
  export type OfferBlockCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many OfferBlocks.
     */
    data: OfferBlockCreateManyInput | OfferBlockCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * OfferBlock createManyAndReturn
   */
  export type OfferBlockCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfferBlock
     */
    select?: OfferBlockSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many OfferBlocks.
     */
    data: OfferBlockCreateManyInput | OfferBlockCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OfferBlockIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * OfferBlock update
   */
  export type OfferBlockUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfferBlock
     */
    select?: OfferBlockSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OfferBlockInclude<ExtArgs> | null
    /**
     * The data needed to update a OfferBlock.
     */
    data: XOR<OfferBlockUpdateInput, OfferBlockUncheckedUpdateInput>
    /**
     * Choose, which OfferBlock to update.
     */
    where: OfferBlockWhereUniqueInput
  }

  /**
   * OfferBlock updateMany
   */
  export type OfferBlockUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update OfferBlocks.
     */
    data: XOR<OfferBlockUpdateManyMutationInput, OfferBlockUncheckedUpdateManyInput>
    /**
     * Filter which OfferBlocks to update
     */
    where?: OfferBlockWhereInput
  }

  /**
   * OfferBlock upsert
   */
  export type OfferBlockUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfferBlock
     */
    select?: OfferBlockSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OfferBlockInclude<ExtArgs> | null
    /**
     * The filter to search for the OfferBlock to update in case it exists.
     */
    where: OfferBlockWhereUniqueInput
    /**
     * In case the OfferBlock found by the `where` argument doesn't exist, create a new OfferBlock with this data.
     */
    create: XOR<OfferBlockCreateInput, OfferBlockUncheckedCreateInput>
    /**
     * In case the OfferBlock was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OfferBlockUpdateInput, OfferBlockUncheckedUpdateInput>
  }

  /**
   * OfferBlock delete
   */
  export type OfferBlockDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfferBlock
     */
    select?: OfferBlockSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OfferBlockInclude<ExtArgs> | null
    /**
     * Filter which OfferBlock to delete.
     */
    where: OfferBlockWhereUniqueInput
  }

  /**
   * OfferBlock deleteMany
   */
  export type OfferBlockDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OfferBlocks to delete
     */
    where?: OfferBlockWhereInput
  }

  /**
   * OfferBlock.order
   */
  export type OfferBlock$orderArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    where?: OrderWhereInput
  }

  /**
   * OfferBlock without action
   */
  export type OfferBlockDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfferBlock
     */
    select?: OfferBlockSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OfferBlockInclude<ExtArgs> | null
  }


  /**
   * Model Order
   */

  export type AggregateOrder = {
    _count: OrderCountAggregateOutputType | null
    _avg: OrderAvgAggregateOutputType | null
    _sum: OrderSumAggregateOutputType | null
    _min: OrderMinAggregateOutputType | null
    _max: OrderMaxAggregateOutputType | null
  }

  export type OrderAvgAggregateOutputType = {
    totalQty: number | null
    totalPrice: number | null
  }

  export type OrderSumAggregateOutputType = {
    totalQty: number | null
    totalPrice: number | null
  }

  export type OrderMinAggregateOutputType = {
    id: string | null
    transactionId: string | null
    providerId: string | null
    selectedOfferId: string | null
    status: string | null
    totalQty: number | null
    totalPrice: number | null
    currency: string | null
    itemsJson: string | null
    quoteJson: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type OrderMaxAggregateOutputType = {
    id: string | null
    transactionId: string | null
    providerId: string | null
    selectedOfferId: string | null
    status: string | null
    totalQty: number | null
    totalPrice: number | null
    currency: string | null
    itemsJson: string | null
    quoteJson: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type OrderCountAggregateOutputType = {
    id: number
    transactionId: number
    providerId: number
    selectedOfferId: number
    status: number
    totalQty: number
    totalPrice: number
    currency: number
    itemsJson: number
    quoteJson: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type OrderAvgAggregateInputType = {
    totalQty?: true
    totalPrice?: true
  }

  export type OrderSumAggregateInputType = {
    totalQty?: true
    totalPrice?: true
  }

  export type OrderMinAggregateInputType = {
    id?: true
    transactionId?: true
    providerId?: true
    selectedOfferId?: true
    status?: true
    totalQty?: true
    totalPrice?: true
    currency?: true
    itemsJson?: true
    quoteJson?: true
    createdAt?: true
    updatedAt?: true
  }

  export type OrderMaxAggregateInputType = {
    id?: true
    transactionId?: true
    providerId?: true
    selectedOfferId?: true
    status?: true
    totalQty?: true
    totalPrice?: true
    currency?: true
    itemsJson?: true
    quoteJson?: true
    createdAt?: true
    updatedAt?: true
  }

  export type OrderCountAggregateInputType = {
    id?: true
    transactionId?: true
    providerId?: true
    selectedOfferId?: true
    status?: true
    totalQty?: true
    totalPrice?: true
    currency?: true
    itemsJson?: true
    quoteJson?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type OrderAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Order to aggregate.
     */
    where?: OrderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Orders to fetch.
     */
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OrderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Orders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Orders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Orders
    **/
    _count?: true | OrderCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: OrderAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: OrderSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OrderMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OrderMaxAggregateInputType
  }

  export type GetOrderAggregateType<T extends OrderAggregateArgs> = {
        [P in keyof T & keyof AggregateOrder]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOrder[P]>
      : GetScalarType<T[P], AggregateOrder[P]>
  }




  export type OrderGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OrderWhereInput
    orderBy?: OrderOrderByWithAggregationInput | OrderOrderByWithAggregationInput[]
    by: OrderScalarFieldEnum[] | OrderScalarFieldEnum
    having?: OrderScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OrderCountAggregateInputType | true
    _avg?: OrderAvgAggregateInputType
    _sum?: OrderSumAggregateInputType
    _min?: OrderMinAggregateInputType
    _max?: OrderMaxAggregateInputType
  }

  export type OrderGroupByOutputType = {
    id: string
    transactionId: string
    providerId: string | null
    selectedOfferId: string | null
    status: string
    totalQty: number | null
    totalPrice: number | null
    currency: string | null
    itemsJson: string
    quoteJson: string
    createdAt: Date
    updatedAt: Date
    _count: OrderCountAggregateOutputType | null
    _avg: OrderAvgAggregateOutputType | null
    _sum: OrderSumAggregateOutputType | null
    _min: OrderMinAggregateOutputType | null
    _max: OrderMaxAggregateOutputType | null
  }

  type GetOrderGroupByPayload<T extends OrderGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OrderGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OrderGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OrderGroupByOutputType[P]>
            : GetScalarType<T[P], OrderGroupByOutputType[P]>
        }
      >
    >


  export type OrderSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    transactionId?: boolean
    providerId?: boolean
    selectedOfferId?: boolean
    status?: boolean
    totalQty?: boolean
    totalPrice?: boolean
    currency?: boolean
    itemsJson?: boolean
    quoteJson?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    provider?: boolean | Order$providerArgs<ExtArgs>
    selectedOffer?: boolean | Order$selectedOfferArgs<ExtArgs>
    blocks?: boolean | Order$blocksArgs<ExtArgs>
    _count?: boolean | OrderCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["order"]>

  export type OrderSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    transactionId?: boolean
    providerId?: boolean
    selectedOfferId?: boolean
    status?: boolean
    totalQty?: boolean
    totalPrice?: boolean
    currency?: boolean
    itemsJson?: boolean
    quoteJson?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    provider?: boolean | Order$providerArgs<ExtArgs>
    selectedOffer?: boolean | Order$selectedOfferArgs<ExtArgs>
  }, ExtArgs["result"]["order"]>

  export type OrderSelectScalar = {
    id?: boolean
    transactionId?: boolean
    providerId?: boolean
    selectedOfferId?: boolean
    status?: boolean
    totalQty?: boolean
    totalPrice?: boolean
    currency?: boolean
    itemsJson?: boolean
    quoteJson?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type OrderInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    provider?: boolean | Order$providerArgs<ExtArgs>
    selectedOffer?: boolean | Order$selectedOfferArgs<ExtArgs>
    blocks?: boolean | Order$blocksArgs<ExtArgs>
    _count?: boolean | OrderCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type OrderIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    provider?: boolean | Order$providerArgs<ExtArgs>
    selectedOffer?: boolean | Order$selectedOfferArgs<ExtArgs>
  }

  export type $OrderPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Order"
    objects: {
      provider: Prisma.$ProviderPayload<ExtArgs> | null
      selectedOffer: Prisma.$CatalogOfferPayload<ExtArgs> | null
      blocks: Prisma.$OfferBlockPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      transactionId: string
      providerId: string | null
      selectedOfferId: string | null
      status: string
      totalQty: number | null
      totalPrice: number | null
      currency: string | null
      itemsJson: string
      quoteJson: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["order"]>
    composites: {}
  }

  type OrderGetPayload<S extends boolean | null | undefined | OrderDefaultArgs> = $Result.GetResult<Prisma.$OrderPayload, S>

  type OrderCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<OrderFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: OrderCountAggregateInputType | true
    }

  export interface OrderDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Order'], meta: { name: 'Order' } }
    /**
     * Find zero or one Order that matches the filter.
     * @param {OrderFindUniqueArgs} args - Arguments to find a Order
     * @example
     * // Get one Order
     * const order = await prisma.order.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends OrderFindUniqueArgs>(args: SelectSubset<T, OrderFindUniqueArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Order that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {OrderFindUniqueOrThrowArgs} args - Arguments to find a Order
     * @example
     * // Get one Order
     * const order = await prisma.order.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends OrderFindUniqueOrThrowArgs>(args: SelectSubset<T, OrderFindUniqueOrThrowArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Order that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderFindFirstArgs} args - Arguments to find a Order
     * @example
     * // Get one Order
     * const order = await prisma.order.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends OrderFindFirstArgs>(args?: SelectSubset<T, OrderFindFirstArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Order that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderFindFirstOrThrowArgs} args - Arguments to find a Order
     * @example
     * // Get one Order
     * const order = await prisma.order.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends OrderFindFirstOrThrowArgs>(args?: SelectSubset<T, OrderFindFirstOrThrowArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Orders that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Orders
     * const orders = await prisma.order.findMany()
     * 
     * // Get first 10 Orders
     * const orders = await prisma.order.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const orderWithIdOnly = await prisma.order.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends OrderFindManyArgs>(args?: SelectSubset<T, OrderFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Order.
     * @param {OrderCreateArgs} args - Arguments to create a Order.
     * @example
     * // Create one Order
     * const Order = await prisma.order.create({
     *   data: {
     *     // ... data to create a Order
     *   }
     * })
     * 
     */
    create<T extends OrderCreateArgs>(args: SelectSubset<T, OrderCreateArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Orders.
     * @param {OrderCreateManyArgs} args - Arguments to create many Orders.
     * @example
     * // Create many Orders
     * const order = await prisma.order.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends OrderCreateManyArgs>(args?: SelectSubset<T, OrderCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Orders and returns the data saved in the database.
     * @param {OrderCreateManyAndReturnArgs} args - Arguments to create many Orders.
     * @example
     * // Create many Orders
     * const order = await prisma.order.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Orders and only return the `id`
     * const orderWithIdOnly = await prisma.order.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends OrderCreateManyAndReturnArgs>(args?: SelectSubset<T, OrderCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Order.
     * @param {OrderDeleteArgs} args - Arguments to delete one Order.
     * @example
     * // Delete one Order
     * const Order = await prisma.order.delete({
     *   where: {
     *     // ... filter to delete one Order
     *   }
     * })
     * 
     */
    delete<T extends OrderDeleteArgs>(args: SelectSubset<T, OrderDeleteArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Order.
     * @param {OrderUpdateArgs} args - Arguments to update one Order.
     * @example
     * // Update one Order
     * const order = await prisma.order.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends OrderUpdateArgs>(args: SelectSubset<T, OrderUpdateArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Orders.
     * @param {OrderDeleteManyArgs} args - Arguments to filter Orders to delete.
     * @example
     * // Delete a few Orders
     * const { count } = await prisma.order.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends OrderDeleteManyArgs>(args?: SelectSubset<T, OrderDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Orders.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Orders
     * const order = await prisma.order.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends OrderUpdateManyArgs>(args: SelectSubset<T, OrderUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Order.
     * @param {OrderUpsertArgs} args - Arguments to update or create a Order.
     * @example
     * // Update or create a Order
     * const order = await prisma.order.upsert({
     *   create: {
     *     // ... data to create a Order
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Order we want to update
     *   }
     * })
     */
    upsert<T extends OrderUpsertArgs>(args: SelectSubset<T, OrderUpsertArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Orders.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderCountArgs} args - Arguments to filter Orders to count.
     * @example
     * // Count the number of Orders
     * const count = await prisma.order.count({
     *   where: {
     *     // ... the filter for the Orders we want to count
     *   }
     * })
    **/
    count<T extends OrderCountArgs>(
      args?: Subset<T, OrderCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OrderCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Order.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OrderAggregateArgs>(args: Subset<T, OrderAggregateArgs>): Prisma.PrismaPromise<GetOrderAggregateType<T>>

    /**
     * Group by Order.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OrderGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OrderGroupByArgs['orderBy'] }
        : { orderBy?: OrderGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OrderGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOrderGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Order model
   */
  readonly fields: OrderFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Order.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OrderClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    provider<T extends Order$providerArgs<ExtArgs> = {}>(args?: Subset<T, Order$providerArgs<ExtArgs>>): Prisma__ProviderClient<$Result.GetResult<Prisma.$ProviderPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    selectedOffer<T extends Order$selectedOfferArgs<ExtArgs> = {}>(args?: Subset<T, Order$selectedOfferArgs<ExtArgs>>): Prisma__CatalogOfferClient<$Result.GetResult<Prisma.$CatalogOfferPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    blocks<T extends Order$blocksArgs<ExtArgs> = {}>(args?: Subset<T, Order$blocksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OfferBlockPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Order model
   */ 
  interface OrderFieldRefs {
    readonly id: FieldRef<"Order", 'String'>
    readonly transactionId: FieldRef<"Order", 'String'>
    readonly providerId: FieldRef<"Order", 'String'>
    readonly selectedOfferId: FieldRef<"Order", 'String'>
    readonly status: FieldRef<"Order", 'String'>
    readonly totalQty: FieldRef<"Order", 'Float'>
    readonly totalPrice: FieldRef<"Order", 'Float'>
    readonly currency: FieldRef<"Order", 'String'>
    readonly itemsJson: FieldRef<"Order", 'String'>
    readonly quoteJson: FieldRef<"Order", 'String'>
    readonly createdAt: FieldRef<"Order", 'DateTime'>
    readonly updatedAt: FieldRef<"Order", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Order findUnique
   */
  export type OrderFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter, which Order to fetch.
     */
    where: OrderWhereUniqueInput
  }

  /**
   * Order findUniqueOrThrow
   */
  export type OrderFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter, which Order to fetch.
     */
    where: OrderWhereUniqueInput
  }

  /**
   * Order findFirst
   */
  export type OrderFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter, which Order to fetch.
     */
    where?: OrderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Orders to fetch.
     */
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Orders.
     */
    cursor?: OrderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Orders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Orders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Orders.
     */
    distinct?: OrderScalarFieldEnum | OrderScalarFieldEnum[]
  }

  /**
   * Order findFirstOrThrow
   */
  export type OrderFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter, which Order to fetch.
     */
    where?: OrderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Orders to fetch.
     */
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Orders.
     */
    cursor?: OrderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Orders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Orders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Orders.
     */
    distinct?: OrderScalarFieldEnum | OrderScalarFieldEnum[]
  }

  /**
   * Order findMany
   */
  export type OrderFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter, which Orders to fetch.
     */
    where?: OrderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Orders to fetch.
     */
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Orders.
     */
    cursor?: OrderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Orders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Orders.
     */
    skip?: number
    distinct?: OrderScalarFieldEnum | OrderScalarFieldEnum[]
  }

  /**
   * Order create
   */
  export type OrderCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * The data needed to create a Order.
     */
    data: XOR<OrderCreateInput, OrderUncheckedCreateInput>
  }

  /**
   * Order createMany
   */
  export type OrderCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Orders.
     */
    data: OrderCreateManyInput | OrderCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Order createManyAndReturn
   */
  export type OrderCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Orders.
     */
    data: OrderCreateManyInput | OrderCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Order update
   */
  export type OrderUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * The data needed to update a Order.
     */
    data: XOR<OrderUpdateInput, OrderUncheckedUpdateInput>
    /**
     * Choose, which Order to update.
     */
    where: OrderWhereUniqueInput
  }

  /**
   * Order updateMany
   */
  export type OrderUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Orders.
     */
    data: XOR<OrderUpdateManyMutationInput, OrderUncheckedUpdateManyInput>
    /**
     * Filter which Orders to update
     */
    where?: OrderWhereInput
  }

  /**
   * Order upsert
   */
  export type OrderUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * The filter to search for the Order to update in case it exists.
     */
    where: OrderWhereUniqueInput
    /**
     * In case the Order found by the `where` argument doesn't exist, create a new Order with this data.
     */
    create: XOR<OrderCreateInput, OrderUncheckedCreateInput>
    /**
     * In case the Order was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OrderUpdateInput, OrderUncheckedUpdateInput>
  }

  /**
   * Order delete
   */
  export type OrderDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter which Order to delete.
     */
    where: OrderWhereUniqueInput
  }

  /**
   * Order deleteMany
   */
  export type OrderDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Orders to delete
     */
    where?: OrderWhereInput
  }

  /**
   * Order.provider
   */
  export type Order$providerArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Provider
     */
    select?: ProviderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProviderInclude<ExtArgs> | null
    where?: ProviderWhereInput
  }

  /**
   * Order.selectedOffer
   */
  export type Order$selectedOfferArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CatalogOffer
     */
    select?: CatalogOfferSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CatalogOfferInclude<ExtArgs> | null
    where?: CatalogOfferWhereInput
  }

  /**
   * Order.blocks
   */
  export type Order$blocksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfferBlock
     */
    select?: OfferBlockSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OfferBlockInclude<ExtArgs> | null
    where?: OfferBlockWhereInput
    orderBy?: OfferBlockOrderByWithRelationInput | OfferBlockOrderByWithRelationInput[]
    cursor?: OfferBlockWhereUniqueInput
    take?: number
    skip?: number
    distinct?: OfferBlockScalarFieldEnum | OfferBlockScalarFieldEnum[]
  }

  /**
   * Order without action
   */
  export type OrderDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
  }


  /**
   * Model Event
   */

  export type AggregateEvent = {
    _count: EventCountAggregateOutputType | null
    _avg: EventAvgAggregateOutputType | null
    _sum: EventSumAggregateOutputType | null
    _min: EventMinAggregateOutputType | null
    _max: EventMaxAggregateOutputType | null
  }

  export type EventAvgAggregateOutputType = {
    id: number | null
  }

  export type EventSumAggregateOutputType = {
    id: number | null
  }

  export type EventMinAggregateOutputType = {
    id: number | null
    transactionId: string | null
    messageId: string | null
    action: string | null
    direction: string | null
    rawJson: string | null
    createdAt: Date | null
  }

  export type EventMaxAggregateOutputType = {
    id: number | null
    transactionId: string | null
    messageId: string | null
    action: string | null
    direction: string | null
    rawJson: string | null
    createdAt: Date | null
  }

  export type EventCountAggregateOutputType = {
    id: number
    transactionId: number
    messageId: number
    action: number
    direction: number
    rawJson: number
    createdAt: number
    _all: number
  }


  export type EventAvgAggregateInputType = {
    id?: true
  }

  export type EventSumAggregateInputType = {
    id?: true
  }

  export type EventMinAggregateInputType = {
    id?: true
    transactionId?: true
    messageId?: true
    action?: true
    direction?: true
    rawJson?: true
    createdAt?: true
  }

  export type EventMaxAggregateInputType = {
    id?: true
    transactionId?: true
    messageId?: true
    action?: true
    direction?: true
    rawJson?: true
    createdAt?: true
  }

  export type EventCountAggregateInputType = {
    id?: true
    transactionId?: true
    messageId?: true
    action?: true
    direction?: true
    rawJson?: true
    createdAt?: true
    _all?: true
  }

  export type EventAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Event to aggregate.
     */
    where?: EventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Events to fetch.
     */
    orderBy?: EventOrderByWithRelationInput | EventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: EventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Events from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Events.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Events
    **/
    _count?: true | EventCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: EventAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: EventSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: EventMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: EventMaxAggregateInputType
  }

  export type GetEventAggregateType<T extends EventAggregateArgs> = {
        [P in keyof T & keyof AggregateEvent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEvent[P]>
      : GetScalarType<T[P], AggregateEvent[P]>
  }




  export type EventGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EventWhereInput
    orderBy?: EventOrderByWithAggregationInput | EventOrderByWithAggregationInput[]
    by: EventScalarFieldEnum[] | EventScalarFieldEnum
    having?: EventScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: EventCountAggregateInputType | true
    _avg?: EventAvgAggregateInputType
    _sum?: EventSumAggregateInputType
    _min?: EventMinAggregateInputType
    _max?: EventMaxAggregateInputType
  }

  export type EventGroupByOutputType = {
    id: number
    transactionId: string
    messageId: string
    action: string
    direction: string
    rawJson: string
    createdAt: Date
    _count: EventCountAggregateOutputType | null
    _avg: EventAvgAggregateOutputType | null
    _sum: EventSumAggregateOutputType | null
    _min: EventMinAggregateOutputType | null
    _max: EventMaxAggregateOutputType | null
  }

  type GetEventGroupByPayload<T extends EventGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<EventGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof EventGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], EventGroupByOutputType[P]>
            : GetScalarType<T[P], EventGroupByOutputType[P]>
        }
      >
    >


  export type EventSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    transactionId?: boolean
    messageId?: boolean
    action?: boolean
    direction?: boolean
    rawJson?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["event"]>

  export type EventSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    transactionId?: boolean
    messageId?: boolean
    action?: boolean
    direction?: boolean
    rawJson?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["event"]>

  export type EventSelectScalar = {
    id?: boolean
    transactionId?: boolean
    messageId?: boolean
    action?: boolean
    direction?: boolean
    rawJson?: boolean
    createdAt?: boolean
  }


  export type $EventPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Event"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      transactionId: string
      messageId: string
      action: string
      direction: string
      rawJson: string
      createdAt: Date
    }, ExtArgs["result"]["event"]>
    composites: {}
  }

  type EventGetPayload<S extends boolean | null | undefined | EventDefaultArgs> = $Result.GetResult<Prisma.$EventPayload, S>

  type EventCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<EventFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: EventCountAggregateInputType | true
    }

  export interface EventDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Event'], meta: { name: 'Event' } }
    /**
     * Find zero or one Event that matches the filter.
     * @param {EventFindUniqueArgs} args - Arguments to find a Event
     * @example
     * // Get one Event
     * const event = await prisma.event.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends EventFindUniqueArgs>(args: SelectSubset<T, EventFindUniqueArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Event that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {EventFindUniqueOrThrowArgs} args - Arguments to find a Event
     * @example
     * // Get one Event
     * const event = await prisma.event.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends EventFindUniqueOrThrowArgs>(args: SelectSubset<T, EventFindUniqueOrThrowArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Event that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EventFindFirstArgs} args - Arguments to find a Event
     * @example
     * // Get one Event
     * const event = await prisma.event.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends EventFindFirstArgs>(args?: SelectSubset<T, EventFindFirstArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Event that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EventFindFirstOrThrowArgs} args - Arguments to find a Event
     * @example
     * // Get one Event
     * const event = await prisma.event.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends EventFindFirstOrThrowArgs>(args?: SelectSubset<T, EventFindFirstOrThrowArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Events that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EventFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Events
     * const events = await prisma.event.findMany()
     * 
     * // Get first 10 Events
     * const events = await prisma.event.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const eventWithIdOnly = await prisma.event.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends EventFindManyArgs>(args?: SelectSubset<T, EventFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Event.
     * @param {EventCreateArgs} args - Arguments to create a Event.
     * @example
     * // Create one Event
     * const Event = await prisma.event.create({
     *   data: {
     *     // ... data to create a Event
     *   }
     * })
     * 
     */
    create<T extends EventCreateArgs>(args: SelectSubset<T, EventCreateArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Events.
     * @param {EventCreateManyArgs} args - Arguments to create many Events.
     * @example
     * // Create many Events
     * const event = await prisma.event.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends EventCreateManyArgs>(args?: SelectSubset<T, EventCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Events and returns the data saved in the database.
     * @param {EventCreateManyAndReturnArgs} args - Arguments to create many Events.
     * @example
     * // Create many Events
     * const event = await prisma.event.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Events and only return the `id`
     * const eventWithIdOnly = await prisma.event.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends EventCreateManyAndReturnArgs>(args?: SelectSubset<T, EventCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Event.
     * @param {EventDeleteArgs} args - Arguments to delete one Event.
     * @example
     * // Delete one Event
     * const Event = await prisma.event.delete({
     *   where: {
     *     // ... filter to delete one Event
     *   }
     * })
     * 
     */
    delete<T extends EventDeleteArgs>(args: SelectSubset<T, EventDeleteArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Event.
     * @param {EventUpdateArgs} args - Arguments to update one Event.
     * @example
     * // Update one Event
     * const event = await prisma.event.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends EventUpdateArgs>(args: SelectSubset<T, EventUpdateArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Events.
     * @param {EventDeleteManyArgs} args - Arguments to filter Events to delete.
     * @example
     * // Delete a few Events
     * const { count } = await prisma.event.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends EventDeleteManyArgs>(args?: SelectSubset<T, EventDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Events.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EventUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Events
     * const event = await prisma.event.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends EventUpdateManyArgs>(args: SelectSubset<T, EventUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Event.
     * @param {EventUpsertArgs} args - Arguments to update or create a Event.
     * @example
     * // Update or create a Event
     * const event = await prisma.event.upsert({
     *   create: {
     *     // ... data to create a Event
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Event we want to update
     *   }
     * })
     */
    upsert<T extends EventUpsertArgs>(args: SelectSubset<T, EventUpsertArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Events.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EventCountArgs} args - Arguments to filter Events to count.
     * @example
     * // Count the number of Events
     * const count = await prisma.event.count({
     *   where: {
     *     // ... the filter for the Events we want to count
     *   }
     * })
    **/
    count<T extends EventCountArgs>(
      args?: Subset<T, EventCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], EventCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Event.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EventAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends EventAggregateArgs>(args: Subset<T, EventAggregateArgs>): Prisma.PrismaPromise<GetEventAggregateType<T>>

    /**
     * Group by Event.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EventGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends EventGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: EventGroupByArgs['orderBy'] }
        : { orderBy?: EventGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, EventGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEventGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Event model
   */
  readonly fields: EventFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Event.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__EventClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Event model
   */ 
  interface EventFieldRefs {
    readonly id: FieldRef<"Event", 'Int'>
    readonly transactionId: FieldRef<"Event", 'String'>
    readonly messageId: FieldRef<"Event", 'String'>
    readonly action: FieldRef<"Event", 'String'>
    readonly direction: FieldRef<"Event", 'String'>
    readonly rawJson: FieldRef<"Event", 'String'>
    readonly createdAt: FieldRef<"Event", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Event findUnique
   */
  export type EventFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Filter, which Event to fetch.
     */
    where: EventWhereUniqueInput
  }

  /**
   * Event findUniqueOrThrow
   */
  export type EventFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Filter, which Event to fetch.
     */
    where: EventWhereUniqueInput
  }

  /**
   * Event findFirst
   */
  export type EventFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Filter, which Event to fetch.
     */
    where?: EventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Events to fetch.
     */
    orderBy?: EventOrderByWithRelationInput | EventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Events.
     */
    cursor?: EventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Events from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Events.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Events.
     */
    distinct?: EventScalarFieldEnum | EventScalarFieldEnum[]
  }

  /**
   * Event findFirstOrThrow
   */
  export type EventFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Filter, which Event to fetch.
     */
    where?: EventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Events to fetch.
     */
    orderBy?: EventOrderByWithRelationInput | EventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Events.
     */
    cursor?: EventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Events from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Events.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Events.
     */
    distinct?: EventScalarFieldEnum | EventScalarFieldEnum[]
  }

  /**
   * Event findMany
   */
  export type EventFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Filter, which Events to fetch.
     */
    where?: EventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Events to fetch.
     */
    orderBy?: EventOrderByWithRelationInput | EventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Events.
     */
    cursor?: EventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Events from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Events.
     */
    skip?: number
    distinct?: EventScalarFieldEnum | EventScalarFieldEnum[]
  }

  /**
   * Event create
   */
  export type EventCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * The data needed to create a Event.
     */
    data: XOR<EventCreateInput, EventUncheckedCreateInput>
  }

  /**
   * Event createMany
   */
  export type EventCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Events.
     */
    data: EventCreateManyInput | EventCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Event createManyAndReturn
   */
  export type EventCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Events.
     */
    data: EventCreateManyInput | EventCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Event update
   */
  export type EventUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * The data needed to update a Event.
     */
    data: XOR<EventUpdateInput, EventUncheckedUpdateInput>
    /**
     * Choose, which Event to update.
     */
    where: EventWhereUniqueInput
  }

  /**
   * Event updateMany
   */
  export type EventUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Events.
     */
    data: XOR<EventUpdateManyMutationInput, EventUncheckedUpdateManyInput>
    /**
     * Filter which Events to update
     */
    where?: EventWhereInput
  }

  /**
   * Event upsert
   */
  export type EventUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * The filter to search for the Event to update in case it exists.
     */
    where: EventWhereUniqueInput
    /**
     * In case the Event found by the `where` argument doesn't exist, create a new Event with this data.
     */
    create: XOR<EventCreateInput, EventUncheckedCreateInput>
    /**
     * In case the Event was found with the provided `where` argument, update it with this data.
     */
    update: XOR<EventUpdateInput, EventUncheckedUpdateInput>
  }

  /**
   * Event delete
   */
  export type EventDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Filter which Event to delete.
     */
    where: EventWhereUniqueInput
  }

  /**
   * Event deleteMany
   */
  export type EventDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Events to delete
     */
    where?: EventWhereInput
  }

  /**
   * Event without action
   */
  export type EventDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const ProviderScalarFieldEnum: {
    id: 'id',
    name: 'name',
    trustScore: 'trustScore',
    totalOrders: 'totalOrders',
    successfulOrders: 'successfulOrders',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ProviderScalarFieldEnum = (typeof ProviderScalarFieldEnum)[keyof typeof ProviderScalarFieldEnum]


  export const CatalogItemScalarFieldEnum: {
    id: 'id',
    providerId: 'providerId',
    sourceType: 'sourceType',
    deliveryMode: 'deliveryMode',
    availableQty: 'availableQty',
    meterId: 'meterId',
    productionWindowsJson: 'productionWindowsJson',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type CatalogItemScalarFieldEnum = (typeof CatalogItemScalarFieldEnum)[keyof typeof CatalogItemScalarFieldEnum]


  export const CatalogOfferScalarFieldEnum: {
    id: 'id',
    itemId: 'itemId',
    providerId: 'providerId',
    priceValue: 'priceValue',
    currency: 'currency',
    maxQty: 'maxQty',
    timeWindowStart: 'timeWindowStart',
    timeWindowEnd: 'timeWindowEnd',
    pricingModel: 'pricingModel',
    settlementType: 'settlementType',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type CatalogOfferScalarFieldEnum = (typeof CatalogOfferScalarFieldEnum)[keyof typeof CatalogOfferScalarFieldEnum]


  export const OfferBlockScalarFieldEnum: {
    id: 'id',
    offerId: 'offerId',
    itemId: 'itemId',
    providerId: 'providerId',
    status: 'status',
    orderId: 'orderId',
    transactionId: 'transactionId',
    priceValue: 'priceValue',
    currency: 'currency',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    reservedAt: 'reservedAt',
    soldAt: 'soldAt'
  };

  export type OfferBlockScalarFieldEnum = (typeof OfferBlockScalarFieldEnum)[keyof typeof OfferBlockScalarFieldEnum]


  export const OrderScalarFieldEnum: {
    id: 'id',
    transactionId: 'transactionId',
    providerId: 'providerId',
    selectedOfferId: 'selectedOfferId',
    status: 'status',
    totalQty: 'totalQty',
    totalPrice: 'totalPrice',
    currency: 'currency',
    itemsJson: 'itemsJson',
    quoteJson: 'quoteJson',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type OrderScalarFieldEnum = (typeof OrderScalarFieldEnum)[keyof typeof OrderScalarFieldEnum]


  export const EventScalarFieldEnum: {
    id: 'id',
    transactionId: 'transactionId',
    messageId: 'messageId',
    action: 'action',
    direction: 'direction',
    rawJson: 'rawJson',
    createdAt: 'createdAt'
  };

  export type EventScalarFieldEnum = (typeof EventScalarFieldEnum)[keyof typeof EventScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    
  /**
   * Deep Input Types
   */


  export type ProviderWhereInput = {
    AND?: ProviderWhereInput | ProviderWhereInput[]
    OR?: ProviderWhereInput[]
    NOT?: ProviderWhereInput | ProviderWhereInput[]
    id?: StringFilter<"Provider"> | string
    name?: StringFilter<"Provider"> | string
    trustScore?: FloatFilter<"Provider"> | number
    totalOrders?: IntFilter<"Provider"> | number
    successfulOrders?: IntFilter<"Provider"> | number
    createdAt?: DateTimeFilter<"Provider"> | Date | string
    updatedAt?: DateTimeFilter<"Provider"> | Date | string
    items?: CatalogItemListRelationFilter
    offers?: CatalogOfferListRelationFilter
    orders?: OrderListRelationFilter
    blocks?: OfferBlockListRelationFilter
  }

  export type ProviderOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    trustScore?: SortOrder
    totalOrders?: SortOrder
    successfulOrders?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    items?: CatalogItemOrderByRelationAggregateInput
    offers?: CatalogOfferOrderByRelationAggregateInput
    orders?: OrderOrderByRelationAggregateInput
    blocks?: OfferBlockOrderByRelationAggregateInput
  }

  export type ProviderWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ProviderWhereInput | ProviderWhereInput[]
    OR?: ProviderWhereInput[]
    NOT?: ProviderWhereInput | ProviderWhereInput[]
    name?: StringFilter<"Provider"> | string
    trustScore?: FloatFilter<"Provider"> | number
    totalOrders?: IntFilter<"Provider"> | number
    successfulOrders?: IntFilter<"Provider"> | number
    createdAt?: DateTimeFilter<"Provider"> | Date | string
    updatedAt?: DateTimeFilter<"Provider"> | Date | string
    items?: CatalogItemListRelationFilter
    offers?: CatalogOfferListRelationFilter
    orders?: OrderListRelationFilter
    blocks?: OfferBlockListRelationFilter
  }, "id">

  export type ProviderOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    trustScore?: SortOrder
    totalOrders?: SortOrder
    successfulOrders?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ProviderCountOrderByAggregateInput
    _avg?: ProviderAvgOrderByAggregateInput
    _max?: ProviderMaxOrderByAggregateInput
    _min?: ProviderMinOrderByAggregateInput
    _sum?: ProviderSumOrderByAggregateInput
  }

  export type ProviderScalarWhereWithAggregatesInput = {
    AND?: ProviderScalarWhereWithAggregatesInput | ProviderScalarWhereWithAggregatesInput[]
    OR?: ProviderScalarWhereWithAggregatesInput[]
    NOT?: ProviderScalarWhereWithAggregatesInput | ProviderScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Provider"> | string
    name?: StringWithAggregatesFilter<"Provider"> | string
    trustScore?: FloatWithAggregatesFilter<"Provider"> | number
    totalOrders?: IntWithAggregatesFilter<"Provider"> | number
    successfulOrders?: IntWithAggregatesFilter<"Provider"> | number
    createdAt?: DateTimeWithAggregatesFilter<"Provider"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Provider"> | Date | string
  }

  export type CatalogItemWhereInput = {
    AND?: CatalogItemWhereInput | CatalogItemWhereInput[]
    OR?: CatalogItemWhereInput[]
    NOT?: CatalogItemWhereInput | CatalogItemWhereInput[]
    id?: StringFilter<"CatalogItem"> | string
    providerId?: StringFilter<"CatalogItem"> | string
    sourceType?: StringFilter<"CatalogItem"> | string
    deliveryMode?: StringFilter<"CatalogItem"> | string
    availableQty?: FloatFilter<"CatalogItem"> | number
    meterId?: StringNullableFilter<"CatalogItem"> | string | null
    productionWindowsJson?: StringFilter<"CatalogItem"> | string
    createdAt?: DateTimeFilter<"CatalogItem"> | Date | string
    updatedAt?: DateTimeFilter<"CatalogItem"> | Date | string
    provider?: XOR<ProviderRelationFilter, ProviderWhereInput>
    offers?: CatalogOfferListRelationFilter
    blocks?: OfferBlockListRelationFilter
  }

  export type CatalogItemOrderByWithRelationInput = {
    id?: SortOrder
    providerId?: SortOrder
    sourceType?: SortOrder
    deliveryMode?: SortOrder
    availableQty?: SortOrder
    meterId?: SortOrderInput | SortOrder
    productionWindowsJson?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    provider?: ProviderOrderByWithRelationInput
    offers?: CatalogOfferOrderByRelationAggregateInput
    blocks?: OfferBlockOrderByRelationAggregateInput
  }

  export type CatalogItemWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: CatalogItemWhereInput | CatalogItemWhereInput[]
    OR?: CatalogItemWhereInput[]
    NOT?: CatalogItemWhereInput | CatalogItemWhereInput[]
    providerId?: StringFilter<"CatalogItem"> | string
    sourceType?: StringFilter<"CatalogItem"> | string
    deliveryMode?: StringFilter<"CatalogItem"> | string
    availableQty?: FloatFilter<"CatalogItem"> | number
    meterId?: StringNullableFilter<"CatalogItem"> | string | null
    productionWindowsJson?: StringFilter<"CatalogItem"> | string
    createdAt?: DateTimeFilter<"CatalogItem"> | Date | string
    updatedAt?: DateTimeFilter<"CatalogItem"> | Date | string
    provider?: XOR<ProviderRelationFilter, ProviderWhereInput>
    offers?: CatalogOfferListRelationFilter
    blocks?: OfferBlockListRelationFilter
  }, "id">

  export type CatalogItemOrderByWithAggregationInput = {
    id?: SortOrder
    providerId?: SortOrder
    sourceType?: SortOrder
    deliveryMode?: SortOrder
    availableQty?: SortOrder
    meterId?: SortOrderInput | SortOrder
    productionWindowsJson?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: CatalogItemCountOrderByAggregateInput
    _avg?: CatalogItemAvgOrderByAggregateInput
    _max?: CatalogItemMaxOrderByAggregateInput
    _min?: CatalogItemMinOrderByAggregateInput
    _sum?: CatalogItemSumOrderByAggregateInput
  }

  export type CatalogItemScalarWhereWithAggregatesInput = {
    AND?: CatalogItemScalarWhereWithAggregatesInput | CatalogItemScalarWhereWithAggregatesInput[]
    OR?: CatalogItemScalarWhereWithAggregatesInput[]
    NOT?: CatalogItemScalarWhereWithAggregatesInput | CatalogItemScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"CatalogItem"> | string
    providerId?: StringWithAggregatesFilter<"CatalogItem"> | string
    sourceType?: StringWithAggregatesFilter<"CatalogItem"> | string
    deliveryMode?: StringWithAggregatesFilter<"CatalogItem"> | string
    availableQty?: FloatWithAggregatesFilter<"CatalogItem"> | number
    meterId?: StringNullableWithAggregatesFilter<"CatalogItem"> | string | null
    productionWindowsJson?: StringWithAggregatesFilter<"CatalogItem"> | string
    createdAt?: DateTimeWithAggregatesFilter<"CatalogItem"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"CatalogItem"> | Date | string
  }

  export type CatalogOfferWhereInput = {
    AND?: CatalogOfferWhereInput | CatalogOfferWhereInput[]
    OR?: CatalogOfferWhereInput[]
    NOT?: CatalogOfferWhereInput | CatalogOfferWhereInput[]
    id?: StringFilter<"CatalogOffer"> | string
    itemId?: StringFilter<"CatalogOffer"> | string
    providerId?: StringFilter<"CatalogOffer"> | string
    priceValue?: FloatFilter<"CatalogOffer"> | number
    currency?: StringFilter<"CatalogOffer"> | string
    maxQty?: FloatFilter<"CatalogOffer"> | number
    timeWindowStart?: DateTimeFilter<"CatalogOffer"> | Date | string
    timeWindowEnd?: DateTimeFilter<"CatalogOffer"> | Date | string
    pricingModel?: StringFilter<"CatalogOffer"> | string
    settlementType?: StringFilter<"CatalogOffer"> | string
    createdAt?: DateTimeFilter<"CatalogOffer"> | Date | string
    updatedAt?: DateTimeFilter<"CatalogOffer"> | Date | string
    item?: XOR<CatalogItemRelationFilter, CatalogItemWhereInput>
    provider?: XOR<ProviderRelationFilter, ProviderWhereInput>
    blocks?: OfferBlockListRelationFilter
    orders?: OrderListRelationFilter
  }

  export type CatalogOfferOrderByWithRelationInput = {
    id?: SortOrder
    itemId?: SortOrder
    providerId?: SortOrder
    priceValue?: SortOrder
    currency?: SortOrder
    maxQty?: SortOrder
    timeWindowStart?: SortOrder
    timeWindowEnd?: SortOrder
    pricingModel?: SortOrder
    settlementType?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    item?: CatalogItemOrderByWithRelationInput
    provider?: ProviderOrderByWithRelationInput
    blocks?: OfferBlockOrderByRelationAggregateInput
    orders?: OrderOrderByRelationAggregateInput
  }

  export type CatalogOfferWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: CatalogOfferWhereInput | CatalogOfferWhereInput[]
    OR?: CatalogOfferWhereInput[]
    NOT?: CatalogOfferWhereInput | CatalogOfferWhereInput[]
    itemId?: StringFilter<"CatalogOffer"> | string
    providerId?: StringFilter<"CatalogOffer"> | string
    priceValue?: FloatFilter<"CatalogOffer"> | number
    currency?: StringFilter<"CatalogOffer"> | string
    maxQty?: FloatFilter<"CatalogOffer"> | number
    timeWindowStart?: DateTimeFilter<"CatalogOffer"> | Date | string
    timeWindowEnd?: DateTimeFilter<"CatalogOffer"> | Date | string
    pricingModel?: StringFilter<"CatalogOffer"> | string
    settlementType?: StringFilter<"CatalogOffer"> | string
    createdAt?: DateTimeFilter<"CatalogOffer"> | Date | string
    updatedAt?: DateTimeFilter<"CatalogOffer"> | Date | string
    item?: XOR<CatalogItemRelationFilter, CatalogItemWhereInput>
    provider?: XOR<ProviderRelationFilter, ProviderWhereInput>
    blocks?: OfferBlockListRelationFilter
    orders?: OrderListRelationFilter
  }, "id">

  export type CatalogOfferOrderByWithAggregationInput = {
    id?: SortOrder
    itemId?: SortOrder
    providerId?: SortOrder
    priceValue?: SortOrder
    currency?: SortOrder
    maxQty?: SortOrder
    timeWindowStart?: SortOrder
    timeWindowEnd?: SortOrder
    pricingModel?: SortOrder
    settlementType?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: CatalogOfferCountOrderByAggregateInput
    _avg?: CatalogOfferAvgOrderByAggregateInput
    _max?: CatalogOfferMaxOrderByAggregateInput
    _min?: CatalogOfferMinOrderByAggregateInput
    _sum?: CatalogOfferSumOrderByAggregateInput
  }

  export type CatalogOfferScalarWhereWithAggregatesInput = {
    AND?: CatalogOfferScalarWhereWithAggregatesInput | CatalogOfferScalarWhereWithAggregatesInput[]
    OR?: CatalogOfferScalarWhereWithAggregatesInput[]
    NOT?: CatalogOfferScalarWhereWithAggregatesInput | CatalogOfferScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"CatalogOffer"> | string
    itemId?: StringWithAggregatesFilter<"CatalogOffer"> | string
    providerId?: StringWithAggregatesFilter<"CatalogOffer"> | string
    priceValue?: FloatWithAggregatesFilter<"CatalogOffer"> | number
    currency?: StringWithAggregatesFilter<"CatalogOffer"> | string
    maxQty?: FloatWithAggregatesFilter<"CatalogOffer"> | number
    timeWindowStart?: DateTimeWithAggregatesFilter<"CatalogOffer"> | Date | string
    timeWindowEnd?: DateTimeWithAggregatesFilter<"CatalogOffer"> | Date | string
    pricingModel?: StringWithAggregatesFilter<"CatalogOffer"> | string
    settlementType?: StringWithAggregatesFilter<"CatalogOffer"> | string
    createdAt?: DateTimeWithAggregatesFilter<"CatalogOffer"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"CatalogOffer"> | Date | string
  }

  export type OfferBlockWhereInput = {
    AND?: OfferBlockWhereInput | OfferBlockWhereInput[]
    OR?: OfferBlockWhereInput[]
    NOT?: OfferBlockWhereInput | OfferBlockWhereInput[]
    id?: StringFilter<"OfferBlock"> | string
    offerId?: StringFilter<"OfferBlock"> | string
    itemId?: StringFilter<"OfferBlock"> | string
    providerId?: StringFilter<"OfferBlock"> | string
    status?: StringFilter<"OfferBlock"> | string
    orderId?: StringNullableFilter<"OfferBlock"> | string | null
    transactionId?: StringNullableFilter<"OfferBlock"> | string | null
    priceValue?: FloatFilter<"OfferBlock"> | number
    currency?: StringFilter<"OfferBlock"> | string
    createdAt?: DateTimeFilter<"OfferBlock"> | Date | string
    updatedAt?: DateTimeFilter<"OfferBlock"> | Date | string
    reservedAt?: DateTimeNullableFilter<"OfferBlock"> | Date | string | null
    soldAt?: DateTimeNullableFilter<"OfferBlock"> | Date | string | null
    offer?: XOR<CatalogOfferRelationFilter, CatalogOfferWhereInput>
    item?: XOR<CatalogItemRelationFilter, CatalogItemWhereInput>
    provider?: XOR<ProviderRelationFilter, ProviderWhereInput>
    order?: XOR<OrderNullableRelationFilter, OrderWhereInput> | null
  }

  export type OfferBlockOrderByWithRelationInput = {
    id?: SortOrder
    offerId?: SortOrder
    itemId?: SortOrder
    providerId?: SortOrder
    status?: SortOrder
    orderId?: SortOrderInput | SortOrder
    transactionId?: SortOrderInput | SortOrder
    priceValue?: SortOrder
    currency?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    reservedAt?: SortOrderInput | SortOrder
    soldAt?: SortOrderInput | SortOrder
    offer?: CatalogOfferOrderByWithRelationInput
    item?: CatalogItemOrderByWithRelationInput
    provider?: ProviderOrderByWithRelationInput
    order?: OrderOrderByWithRelationInput
  }

  export type OfferBlockWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: OfferBlockWhereInput | OfferBlockWhereInput[]
    OR?: OfferBlockWhereInput[]
    NOT?: OfferBlockWhereInput | OfferBlockWhereInput[]
    offerId?: StringFilter<"OfferBlock"> | string
    itemId?: StringFilter<"OfferBlock"> | string
    providerId?: StringFilter<"OfferBlock"> | string
    status?: StringFilter<"OfferBlock"> | string
    orderId?: StringNullableFilter<"OfferBlock"> | string | null
    transactionId?: StringNullableFilter<"OfferBlock"> | string | null
    priceValue?: FloatFilter<"OfferBlock"> | number
    currency?: StringFilter<"OfferBlock"> | string
    createdAt?: DateTimeFilter<"OfferBlock"> | Date | string
    updatedAt?: DateTimeFilter<"OfferBlock"> | Date | string
    reservedAt?: DateTimeNullableFilter<"OfferBlock"> | Date | string | null
    soldAt?: DateTimeNullableFilter<"OfferBlock"> | Date | string | null
    offer?: XOR<CatalogOfferRelationFilter, CatalogOfferWhereInput>
    item?: XOR<CatalogItemRelationFilter, CatalogItemWhereInput>
    provider?: XOR<ProviderRelationFilter, ProviderWhereInput>
    order?: XOR<OrderNullableRelationFilter, OrderWhereInput> | null
  }, "id">

  export type OfferBlockOrderByWithAggregationInput = {
    id?: SortOrder
    offerId?: SortOrder
    itemId?: SortOrder
    providerId?: SortOrder
    status?: SortOrder
    orderId?: SortOrderInput | SortOrder
    transactionId?: SortOrderInput | SortOrder
    priceValue?: SortOrder
    currency?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    reservedAt?: SortOrderInput | SortOrder
    soldAt?: SortOrderInput | SortOrder
    _count?: OfferBlockCountOrderByAggregateInput
    _avg?: OfferBlockAvgOrderByAggregateInput
    _max?: OfferBlockMaxOrderByAggregateInput
    _min?: OfferBlockMinOrderByAggregateInput
    _sum?: OfferBlockSumOrderByAggregateInput
  }

  export type OfferBlockScalarWhereWithAggregatesInput = {
    AND?: OfferBlockScalarWhereWithAggregatesInput | OfferBlockScalarWhereWithAggregatesInput[]
    OR?: OfferBlockScalarWhereWithAggregatesInput[]
    NOT?: OfferBlockScalarWhereWithAggregatesInput | OfferBlockScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"OfferBlock"> | string
    offerId?: StringWithAggregatesFilter<"OfferBlock"> | string
    itemId?: StringWithAggregatesFilter<"OfferBlock"> | string
    providerId?: StringWithAggregatesFilter<"OfferBlock"> | string
    status?: StringWithAggregatesFilter<"OfferBlock"> | string
    orderId?: StringNullableWithAggregatesFilter<"OfferBlock"> | string | null
    transactionId?: StringNullableWithAggregatesFilter<"OfferBlock"> | string | null
    priceValue?: FloatWithAggregatesFilter<"OfferBlock"> | number
    currency?: StringWithAggregatesFilter<"OfferBlock"> | string
    createdAt?: DateTimeWithAggregatesFilter<"OfferBlock"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"OfferBlock"> | Date | string
    reservedAt?: DateTimeNullableWithAggregatesFilter<"OfferBlock"> | Date | string | null
    soldAt?: DateTimeNullableWithAggregatesFilter<"OfferBlock"> | Date | string | null
  }

  export type OrderWhereInput = {
    AND?: OrderWhereInput | OrderWhereInput[]
    OR?: OrderWhereInput[]
    NOT?: OrderWhereInput | OrderWhereInput[]
    id?: StringFilter<"Order"> | string
    transactionId?: StringFilter<"Order"> | string
    providerId?: StringNullableFilter<"Order"> | string | null
    selectedOfferId?: StringNullableFilter<"Order"> | string | null
    status?: StringFilter<"Order"> | string
    totalQty?: FloatNullableFilter<"Order"> | number | null
    totalPrice?: FloatNullableFilter<"Order"> | number | null
    currency?: StringNullableFilter<"Order"> | string | null
    itemsJson?: StringFilter<"Order"> | string
    quoteJson?: StringFilter<"Order"> | string
    createdAt?: DateTimeFilter<"Order"> | Date | string
    updatedAt?: DateTimeFilter<"Order"> | Date | string
    provider?: XOR<ProviderNullableRelationFilter, ProviderWhereInput> | null
    selectedOffer?: XOR<CatalogOfferNullableRelationFilter, CatalogOfferWhereInput> | null
    blocks?: OfferBlockListRelationFilter
  }

  export type OrderOrderByWithRelationInput = {
    id?: SortOrder
    transactionId?: SortOrder
    providerId?: SortOrderInput | SortOrder
    selectedOfferId?: SortOrderInput | SortOrder
    status?: SortOrder
    totalQty?: SortOrderInput | SortOrder
    totalPrice?: SortOrderInput | SortOrder
    currency?: SortOrderInput | SortOrder
    itemsJson?: SortOrder
    quoteJson?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    provider?: ProviderOrderByWithRelationInput
    selectedOffer?: CatalogOfferOrderByWithRelationInput
    blocks?: OfferBlockOrderByRelationAggregateInput
  }

  export type OrderWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    transactionId?: string
    AND?: OrderWhereInput | OrderWhereInput[]
    OR?: OrderWhereInput[]
    NOT?: OrderWhereInput | OrderWhereInput[]
    providerId?: StringNullableFilter<"Order"> | string | null
    selectedOfferId?: StringNullableFilter<"Order"> | string | null
    status?: StringFilter<"Order"> | string
    totalQty?: FloatNullableFilter<"Order"> | number | null
    totalPrice?: FloatNullableFilter<"Order"> | number | null
    currency?: StringNullableFilter<"Order"> | string | null
    itemsJson?: StringFilter<"Order"> | string
    quoteJson?: StringFilter<"Order"> | string
    createdAt?: DateTimeFilter<"Order"> | Date | string
    updatedAt?: DateTimeFilter<"Order"> | Date | string
    provider?: XOR<ProviderNullableRelationFilter, ProviderWhereInput> | null
    selectedOffer?: XOR<CatalogOfferNullableRelationFilter, CatalogOfferWhereInput> | null
    blocks?: OfferBlockListRelationFilter
  }, "id" | "transactionId">

  export type OrderOrderByWithAggregationInput = {
    id?: SortOrder
    transactionId?: SortOrder
    providerId?: SortOrderInput | SortOrder
    selectedOfferId?: SortOrderInput | SortOrder
    status?: SortOrder
    totalQty?: SortOrderInput | SortOrder
    totalPrice?: SortOrderInput | SortOrder
    currency?: SortOrderInput | SortOrder
    itemsJson?: SortOrder
    quoteJson?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: OrderCountOrderByAggregateInput
    _avg?: OrderAvgOrderByAggregateInput
    _max?: OrderMaxOrderByAggregateInput
    _min?: OrderMinOrderByAggregateInput
    _sum?: OrderSumOrderByAggregateInput
  }

  export type OrderScalarWhereWithAggregatesInput = {
    AND?: OrderScalarWhereWithAggregatesInput | OrderScalarWhereWithAggregatesInput[]
    OR?: OrderScalarWhereWithAggregatesInput[]
    NOT?: OrderScalarWhereWithAggregatesInput | OrderScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Order"> | string
    transactionId?: StringWithAggregatesFilter<"Order"> | string
    providerId?: StringNullableWithAggregatesFilter<"Order"> | string | null
    selectedOfferId?: StringNullableWithAggregatesFilter<"Order"> | string | null
    status?: StringWithAggregatesFilter<"Order"> | string
    totalQty?: FloatNullableWithAggregatesFilter<"Order"> | number | null
    totalPrice?: FloatNullableWithAggregatesFilter<"Order"> | number | null
    currency?: StringNullableWithAggregatesFilter<"Order"> | string | null
    itemsJson?: StringWithAggregatesFilter<"Order"> | string
    quoteJson?: StringWithAggregatesFilter<"Order"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Order"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Order"> | Date | string
  }

  export type EventWhereInput = {
    AND?: EventWhereInput | EventWhereInput[]
    OR?: EventWhereInput[]
    NOT?: EventWhereInput | EventWhereInput[]
    id?: IntFilter<"Event"> | number
    transactionId?: StringFilter<"Event"> | string
    messageId?: StringFilter<"Event"> | string
    action?: StringFilter<"Event"> | string
    direction?: StringFilter<"Event"> | string
    rawJson?: StringFilter<"Event"> | string
    createdAt?: DateTimeFilter<"Event"> | Date | string
  }

  export type EventOrderByWithRelationInput = {
    id?: SortOrder
    transactionId?: SortOrder
    messageId?: SortOrder
    action?: SortOrder
    direction?: SortOrder
    rawJson?: SortOrder
    createdAt?: SortOrder
  }

  export type EventWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: EventWhereInput | EventWhereInput[]
    OR?: EventWhereInput[]
    NOT?: EventWhereInput | EventWhereInput[]
    transactionId?: StringFilter<"Event"> | string
    messageId?: StringFilter<"Event"> | string
    action?: StringFilter<"Event"> | string
    direction?: StringFilter<"Event"> | string
    rawJson?: StringFilter<"Event"> | string
    createdAt?: DateTimeFilter<"Event"> | Date | string
  }, "id">

  export type EventOrderByWithAggregationInput = {
    id?: SortOrder
    transactionId?: SortOrder
    messageId?: SortOrder
    action?: SortOrder
    direction?: SortOrder
    rawJson?: SortOrder
    createdAt?: SortOrder
    _count?: EventCountOrderByAggregateInput
    _avg?: EventAvgOrderByAggregateInput
    _max?: EventMaxOrderByAggregateInput
    _min?: EventMinOrderByAggregateInput
    _sum?: EventSumOrderByAggregateInput
  }

  export type EventScalarWhereWithAggregatesInput = {
    AND?: EventScalarWhereWithAggregatesInput | EventScalarWhereWithAggregatesInput[]
    OR?: EventScalarWhereWithAggregatesInput[]
    NOT?: EventScalarWhereWithAggregatesInput | EventScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Event"> | number
    transactionId?: StringWithAggregatesFilter<"Event"> | string
    messageId?: StringWithAggregatesFilter<"Event"> | string
    action?: StringWithAggregatesFilter<"Event"> | string
    direction?: StringWithAggregatesFilter<"Event"> | string
    rawJson?: StringWithAggregatesFilter<"Event"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Event"> | Date | string
  }

  export type ProviderCreateInput = {
    id: string
    name: string
    trustScore?: number
    totalOrders?: number
    successfulOrders?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: CatalogItemCreateNestedManyWithoutProviderInput
    offers?: CatalogOfferCreateNestedManyWithoutProviderInput
    orders?: OrderCreateNestedManyWithoutProviderInput
    blocks?: OfferBlockCreateNestedManyWithoutProviderInput
  }

  export type ProviderUncheckedCreateInput = {
    id: string
    name: string
    trustScore?: number
    totalOrders?: number
    successfulOrders?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: CatalogItemUncheckedCreateNestedManyWithoutProviderInput
    offers?: CatalogOfferUncheckedCreateNestedManyWithoutProviderInput
    orders?: OrderUncheckedCreateNestedManyWithoutProviderInput
    blocks?: OfferBlockUncheckedCreateNestedManyWithoutProviderInput
  }

  export type ProviderUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trustScore?: FloatFieldUpdateOperationsInput | number
    totalOrders?: IntFieldUpdateOperationsInput | number
    successfulOrders?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: CatalogItemUpdateManyWithoutProviderNestedInput
    offers?: CatalogOfferUpdateManyWithoutProviderNestedInput
    orders?: OrderUpdateManyWithoutProviderNestedInput
    blocks?: OfferBlockUpdateManyWithoutProviderNestedInput
  }

  export type ProviderUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trustScore?: FloatFieldUpdateOperationsInput | number
    totalOrders?: IntFieldUpdateOperationsInput | number
    successfulOrders?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: CatalogItemUncheckedUpdateManyWithoutProviderNestedInput
    offers?: CatalogOfferUncheckedUpdateManyWithoutProviderNestedInput
    orders?: OrderUncheckedUpdateManyWithoutProviderNestedInput
    blocks?: OfferBlockUncheckedUpdateManyWithoutProviderNestedInput
  }

  export type ProviderCreateManyInput = {
    id: string
    name: string
    trustScore?: number
    totalOrders?: number
    successfulOrders?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProviderUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trustScore?: FloatFieldUpdateOperationsInput | number
    totalOrders?: IntFieldUpdateOperationsInput | number
    successfulOrders?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProviderUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trustScore?: FloatFieldUpdateOperationsInput | number
    totalOrders?: IntFieldUpdateOperationsInput | number
    successfulOrders?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CatalogItemCreateInput = {
    id: string
    sourceType: string
    deliveryMode: string
    availableQty: number
    meterId?: string | null
    productionWindowsJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
    provider: ProviderCreateNestedOneWithoutItemsInput
    offers?: CatalogOfferCreateNestedManyWithoutItemInput
    blocks?: OfferBlockCreateNestedManyWithoutItemInput
  }

  export type CatalogItemUncheckedCreateInput = {
    id: string
    providerId: string
    sourceType: string
    deliveryMode: string
    availableQty: number
    meterId?: string | null
    productionWindowsJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
    offers?: CatalogOfferUncheckedCreateNestedManyWithoutItemInput
    blocks?: OfferBlockUncheckedCreateNestedManyWithoutItemInput
  }

  export type CatalogItemUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    sourceType?: StringFieldUpdateOperationsInput | string
    deliveryMode?: StringFieldUpdateOperationsInput | string
    availableQty?: FloatFieldUpdateOperationsInput | number
    meterId?: NullableStringFieldUpdateOperationsInput | string | null
    productionWindowsJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    provider?: ProviderUpdateOneRequiredWithoutItemsNestedInput
    offers?: CatalogOfferUpdateManyWithoutItemNestedInput
    blocks?: OfferBlockUpdateManyWithoutItemNestedInput
  }

  export type CatalogItemUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    sourceType?: StringFieldUpdateOperationsInput | string
    deliveryMode?: StringFieldUpdateOperationsInput | string
    availableQty?: FloatFieldUpdateOperationsInput | number
    meterId?: NullableStringFieldUpdateOperationsInput | string | null
    productionWindowsJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    offers?: CatalogOfferUncheckedUpdateManyWithoutItemNestedInput
    blocks?: OfferBlockUncheckedUpdateManyWithoutItemNestedInput
  }

  export type CatalogItemCreateManyInput = {
    id: string
    providerId: string
    sourceType: string
    deliveryMode: string
    availableQty: number
    meterId?: string | null
    productionWindowsJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CatalogItemUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    sourceType?: StringFieldUpdateOperationsInput | string
    deliveryMode?: StringFieldUpdateOperationsInput | string
    availableQty?: FloatFieldUpdateOperationsInput | number
    meterId?: NullableStringFieldUpdateOperationsInput | string | null
    productionWindowsJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CatalogItemUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    sourceType?: StringFieldUpdateOperationsInput | string
    deliveryMode?: StringFieldUpdateOperationsInput | string
    availableQty?: FloatFieldUpdateOperationsInput | number
    meterId?: NullableStringFieldUpdateOperationsInput | string | null
    productionWindowsJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CatalogOfferCreateInput = {
    id: string
    priceValue: number
    currency?: string
    maxQty: number
    timeWindowStart: Date | string
    timeWindowEnd: Date | string
    pricingModel?: string
    settlementType?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    item: CatalogItemCreateNestedOneWithoutOffersInput
    provider: ProviderCreateNestedOneWithoutOffersInput
    blocks?: OfferBlockCreateNestedManyWithoutOfferInput
    orders?: OrderCreateNestedManyWithoutSelectedOfferInput
  }

  export type CatalogOfferUncheckedCreateInput = {
    id: string
    itemId: string
    providerId: string
    priceValue: number
    currency?: string
    maxQty: number
    timeWindowStart: Date | string
    timeWindowEnd: Date | string
    pricingModel?: string
    settlementType?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    blocks?: OfferBlockUncheckedCreateNestedManyWithoutOfferInput
    orders?: OrderUncheckedCreateNestedManyWithoutSelectedOfferInput
  }

  export type CatalogOfferUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    maxQty?: FloatFieldUpdateOperationsInput | number
    timeWindowStart?: DateTimeFieldUpdateOperationsInput | Date | string
    timeWindowEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    pricingModel?: StringFieldUpdateOperationsInput | string
    settlementType?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    item?: CatalogItemUpdateOneRequiredWithoutOffersNestedInput
    provider?: ProviderUpdateOneRequiredWithoutOffersNestedInput
    blocks?: OfferBlockUpdateManyWithoutOfferNestedInput
    orders?: OrderUpdateManyWithoutSelectedOfferNestedInput
  }

  export type CatalogOfferUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    maxQty?: FloatFieldUpdateOperationsInput | number
    timeWindowStart?: DateTimeFieldUpdateOperationsInput | Date | string
    timeWindowEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    pricingModel?: StringFieldUpdateOperationsInput | string
    settlementType?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    blocks?: OfferBlockUncheckedUpdateManyWithoutOfferNestedInput
    orders?: OrderUncheckedUpdateManyWithoutSelectedOfferNestedInput
  }

  export type CatalogOfferCreateManyInput = {
    id: string
    itemId: string
    providerId: string
    priceValue: number
    currency?: string
    maxQty: number
    timeWindowStart: Date | string
    timeWindowEnd: Date | string
    pricingModel?: string
    settlementType?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CatalogOfferUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    maxQty?: FloatFieldUpdateOperationsInput | number
    timeWindowStart?: DateTimeFieldUpdateOperationsInput | Date | string
    timeWindowEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    pricingModel?: StringFieldUpdateOperationsInput | string
    settlementType?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CatalogOfferUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    maxQty?: FloatFieldUpdateOperationsInput | number
    timeWindowStart?: DateTimeFieldUpdateOperationsInput | Date | string
    timeWindowEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    pricingModel?: StringFieldUpdateOperationsInput | string
    settlementType?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OfferBlockCreateInput = {
    id: string
    status?: string
    transactionId?: string | null
    priceValue: number
    currency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reservedAt?: Date | string | null
    soldAt?: Date | string | null
    offer: CatalogOfferCreateNestedOneWithoutBlocksInput
    item: CatalogItemCreateNestedOneWithoutBlocksInput
    provider: ProviderCreateNestedOneWithoutBlocksInput
    order?: OrderCreateNestedOneWithoutBlocksInput
  }

  export type OfferBlockUncheckedCreateInput = {
    id: string
    offerId: string
    itemId: string
    providerId: string
    status?: string
    orderId?: string | null
    transactionId?: string | null
    priceValue: number
    currency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reservedAt?: Date | string | null
    soldAt?: Date | string | null
  }

  export type OfferBlockUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reservedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    soldAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    offer?: CatalogOfferUpdateOneRequiredWithoutBlocksNestedInput
    item?: CatalogItemUpdateOneRequiredWithoutBlocksNestedInput
    provider?: ProviderUpdateOneRequiredWithoutBlocksNestedInput
    order?: OrderUpdateOneWithoutBlocksNestedInput
  }

  export type OfferBlockUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    offerId?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    orderId?: NullableStringFieldUpdateOperationsInput | string | null
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reservedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    soldAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OfferBlockCreateManyInput = {
    id: string
    offerId: string
    itemId: string
    providerId: string
    status?: string
    orderId?: string | null
    transactionId?: string | null
    priceValue: number
    currency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reservedAt?: Date | string | null
    soldAt?: Date | string | null
  }

  export type OfferBlockUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reservedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    soldAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OfferBlockUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    offerId?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    orderId?: NullableStringFieldUpdateOperationsInput | string | null
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reservedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    soldAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OrderCreateInput = {
    id: string
    transactionId: string
    status?: string
    totalQty?: number | null
    totalPrice?: number | null
    currency?: string | null
    itemsJson: string
    quoteJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
    provider?: ProviderCreateNestedOneWithoutOrdersInput
    selectedOffer?: CatalogOfferCreateNestedOneWithoutOrdersInput
    blocks?: OfferBlockCreateNestedManyWithoutOrderInput
  }

  export type OrderUncheckedCreateInput = {
    id: string
    transactionId: string
    providerId?: string | null
    selectedOfferId?: string | null
    status?: string
    totalQty?: number | null
    totalPrice?: number | null
    currency?: string | null
    itemsJson: string
    quoteJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
    blocks?: OfferBlockUncheckedCreateNestedManyWithoutOrderInput
  }

  export type OrderUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    transactionId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    totalQty?: NullableFloatFieldUpdateOperationsInput | number | null
    totalPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    itemsJson?: StringFieldUpdateOperationsInput | string
    quoteJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    provider?: ProviderUpdateOneWithoutOrdersNestedInput
    selectedOffer?: CatalogOfferUpdateOneWithoutOrdersNestedInput
    blocks?: OfferBlockUpdateManyWithoutOrderNestedInput
  }

  export type OrderUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    transactionId?: StringFieldUpdateOperationsInput | string
    providerId?: NullableStringFieldUpdateOperationsInput | string | null
    selectedOfferId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    totalQty?: NullableFloatFieldUpdateOperationsInput | number | null
    totalPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    itemsJson?: StringFieldUpdateOperationsInput | string
    quoteJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    blocks?: OfferBlockUncheckedUpdateManyWithoutOrderNestedInput
  }

  export type OrderCreateManyInput = {
    id: string
    transactionId: string
    providerId?: string | null
    selectedOfferId?: string | null
    status?: string
    totalQty?: number | null
    totalPrice?: number | null
    currency?: string | null
    itemsJson: string
    quoteJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OrderUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    transactionId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    totalQty?: NullableFloatFieldUpdateOperationsInput | number | null
    totalPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    itemsJson?: StringFieldUpdateOperationsInput | string
    quoteJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrderUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    transactionId?: StringFieldUpdateOperationsInput | string
    providerId?: NullableStringFieldUpdateOperationsInput | string | null
    selectedOfferId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    totalQty?: NullableFloatFieldUpdateOperationsInput | number | null
    totalPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    itemsJson?: StringFieldUpdateOperationsInput | string
    quoteJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EventCreateInput = {
    transactionId: string
    messageId: string
    action: string
    direction: string
    rawJson: string
    createdAt?: Date | string
  }

  export type EventUncheckedCreateInput = {
    id?: number
    transactionId: string
    messageId: string
    action: string
    direction: string
    rawJson: string
    createdAt?: Date | string
  }

  export type EventUpdateInput = {
    transactionId?: StringFieldUpdateOperationsInput | string
    messageId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    direction?: StringFieldUpdateOperationsInput | string
    rawJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EventUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    transactionId?: StringFieldUpdateOperationsInput | string
    messageId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    direction?: StringFieldUpdateOperationsInput | string
    rawJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EventCreateManyInput = {
    id?: number
    transactionId: string
    messageId: string
    action: string
    direction: string
    rawJson: string
    createdAt?: Date | string
  }

  export type EventUpdateManyMutationInput = {
    transactionId?: StringFieldUpdateOperationsInput | string
    messageId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    direction?: StringFieldUpdateOperationsInput | string
    rawJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EventUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    transactionId?: StringFieldUpdateOperationsInput | string
    messageId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    direction?: StringFieldUpdateOperationsInput | string
    rawJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type CatalogItemListRelationFilter = {
    every?: CatalogItemWhereInput
    some?: CatalogItemWhereInput
    none?: CatalogItemWhereInput
  }

  export type CatalogOfferListRelationFilter = {
    every?: CatalogOfferWhereInput
    some?: CatalogOfferWhereInput
    none?: CatalogOfferWhereInput
  }

  export type OrderListRelationFilter = {
    every?: OrderWhereInput
    some?: OrderWhereInput
    none?: OrderWhereInput
  }

  export type OfferBlockListRelationFilter = {
    every?: OfferBlockWhereInput
    some?: OfferBlockWhereInput
    none?: OfferBlockWhereInput
  }

  export type CatalogItemOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CatalogOfferOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type OrderOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type OfferBlockOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ProviderCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    trustScore?: SortOrder
    totalOrders?: SortOrder
    successfulOrders?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProviderAvgOrderByAggregateInput = {
    trustScore?: SortOrder
    totalOrders?: SortOrder
    successfulOrders?: SortOrder
  }

  export type ProviderMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    trustScore?: SortOrder
    totalOrders?: SortOrder
    successfulOrders?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProviderMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    trustScore?: SortOrder
    totalOrders?: SortOrder
    successfulOrders?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProviderSumOrderByAggregateInput = {
    trustScore?: SortOrder
    totalOrders?: SortOrder
    successfulOrders?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type ProviderRelationFilter = {
    is?: ProviderWhereInput
    isNot?: ProviderWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type CatalogItemCountOrderByAggregateInput = {
    id?: SortOrder
    providerId?: SortOrder
    sourceType?: SortOrder
    deliveryMode?: SortOrder
    availableQty?: SortOrder
    meterId?: SortOrder
    productionWindowsJson?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CatalogItemAvgOrderByAggregateInput = {
    availableQty?: SortOrder
  }

  export type CatalogItemMaxOrderByAggregateInput = {
    id?: SortOrder
    providerId?: SortOrder
    sourceType?: SortOrder
    deliveryMode?: SortOrder
    availableQty?: SortOrder
    meterId?: SortOrder
    productionWindowsJson?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CatalogItemMinOrderByAggregateInput = {
    id?: SortOrder
    providerId?: SortOrder
    sourceType?: SortOrder
    deliveryMode?: SortOrder
    availableQty?: SortOrder
    meterId?: SortOrder
    productionWindowsJson?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CatalogItemSumOrderByAggregateInput = {
    availableQty?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type CatalogItemRelationFilter = {
    is?: CatalogItemWhereInput
    isNot?: CatalogItemWhereInput
  }

  export type CatalogOfferCountOrderByAggregateInput = {
    id?: SortOrder
    itemId?: SortOrder
    providerId?: SortOrder
    priceValue?: SortOrder
    currency?: SortOrder
    maxQty?: SortOrder
    timeWindowStart?: SortOrder
    timeWindowEnd?: SortOrder
    pricingModel?: SortOrder
    settlementType?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CatalogOfferAvgOrderByAggregateInput = {
    priceValue?: SortOrder
    maxQty?: SortOrder
  }

  export type CatalogOfferMaxOrderByAggregateInput = {
    id?: SortOrder
    itemId?: SortOrder
    providerId?: SortOrder
    priceValue?: SortOrder
    currency?: SortOrder
    maxQty?: SortOrder
    timeWindowStart?: SortOrder
    timeWindowEnd?: SortOrder
    pricingModel?: SortOrder
    settlementType?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CatalogOfferMinOrderByAggregateInput = {
    id?: SortOrder
    itemId?: SortOrder
    providerId?: SortOrder
    priceValue?: SortOrder
    currency?: SortOrder
    maxQty?: SortOrder
    timeWindowStart?: SortOrder
    timeWindowEnd?: SortOrder
    pricingModel?: SortOrder
    settlementType?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CatalogOfferSumOrderByAggregateInput = {
    priceValue?: SortOrder
    maxQty?: SortOrder
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type CatalogOfferRelationFilter = {
    is?: CatalogOfferWhereInput
    isNot?: CatalogOfferWhereInput
  }

  export type OrderNullableRelationFilter = {
    is?: OrderWhereInput | null
    isNot?: OrderWhereInput | null
  }

  export type OfferBlockCountOrderByAggregateInput = {
    id?: SortOrder
    offerId?: SortOrder
    itemId?: SortOrder
    providerId?: SortOrder
    status?: SortOrder
    orderId?: SortOrder
    transactionId?: SortOrder
    priceValue?: SortOrder
    currency?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    reservedAt?: SortOrder
    soldAt?: SortOrder
  }

  export type OfferBlockAvgOrderByAggregateInput = {
    priceValue?: SortOrder
  }

  export type OfferBlockMaxOrderByAggregateInput = {
    id?: SortOrder
    offerId?: SortOrder
    itemId?: SortOrder
    providerId?: SortOrder
    status?: SortOrder
    orderId?: SortOrder
    transactionId?: SortOrder
    priceValue?: SortOrder
    currency?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    reservedAt?: SortOrder
    soldAt?: SortOrder
  }

  export type OfferBlockMinOrderByAggregateInput = {
    id?: SortOrder
    offerId?: SortOrder
    itemId?: SortOrder
    providerId?: SortOrder
    status?: SortOrder
    orderId?: SortOrder
    transactionId?: SortOrder
    priceValue?: SortOrder
    currency?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    reservedAt?: SortOrder
    soldAt?: SortOrder
  }

  export type OfferBlockSumOrderByAggregateInput = {
    priceValue?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type ProviderNullableRelationFilter = {
    is?: ProviderWhereInput | null
    isNot?: ProviderWhereInput | null
  }

  export type CatalogOfferNullableRelationFilter = {
    is?: CatalogOfferWhereInput | null
    isNot?: CatalogOfferWhereInput | null
  }

  export type OrderCountOrderByAggregateInput = {
    id?: SortOrder
    transactionId?: SortOrder
    providerId?: SortOrder
    selectedOfferId?: SortOrder
    status?: SortOrder
    totalQty?: SortOrder
    totalPrice?: SortOrder
    currency?: SortOrder
    itemsJson?: SortOrder
    quoteJson?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OrderAvgOrderByAggregateInput = {
    totalQty?: SortOrder
    totalPrice?: SortOrder
  }

  export type OrderMaxOrderByAggregateInput = {
    id?: SortOrder
    transactionId?: SortOrder
    providerId?: SortOrder
    selectedOfferId?: SortOrder
    status?: SortOrder
    totalQty?: SortOrder
    totalPrice?: SortOrder
    currency?: SortOrder
    itemsJson?: SortOrder
    quoteJson?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OrderMinOrderByAggregateInput = {
    id?: SortOrder
    transactionId?: SortOrder
    providerId?: SortOrder
    selectedOfferId?: SortOrder
    status?: SortOrder
    totalQty?: SortOrder
    totalPrice?: SortOrder
    currency?: SortOrder
    itemsJson?: SortOrder
    quoteJson?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OrderSumOrderByAggregateInput = {
    totalQty?: SortOrder
    totalPrice?: SortOrder
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type EventCountOrderByAggregateInput = {
    id?: SortOrder
    transactionId?: SortOrder
    messageId?: SortOrder
    action?: SortOrder
    direction?: SortOrder
    rawJson?: SortOrder
    createdAt?: SortOrder
  }

  export type EventAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type EventMaxOrderByAggregateInput = {
    id?: SortOrder
    transactionId?: SortOrder
    messageId?: SortOrder
    action?: SortOrder
    direction?: SortOrder
    rawJson?: SortOrder
    createdAt?: SortOrder
  }

  export type EventMinOrderByAggregateInput = {
    id?: SortOrder
    transactionId?: SortOrder
    messageId?: SortOrder
    action?: SortOrder
    direction?: SortOrder
    rawJson?: SortOrder
    createdAt?: SortOrder
  }

  export type EventSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type CatalogItemCreateNestedManyWithoutProviderInput = {
    create?: XOR<CatalogItemCreateWithoutProviderInput, CatalogItemUncheckedCreateWithoutProviderInput> | CatalogItemCreateWithoutProviderInput[] | CatalogItemUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: CatalogItemCreateOrConnectWithoutProviderInput | CatalogItemCreateOrConnectWithoutProviderInput[]
    createMany?: CatalogItemCreateManyProviderInputEnvelope
    connect?: CatalogItemWhereUniqueInput | CatalogItemWhereUniqueInput[]
  }

  export type CatalogOfferCreateNestedManyWithoutProviderInput = {
    create?: XOR<CatalogOfferCreateWithoutProviderInput, CatalogOfferUncheckedCreateWithoutProviderInput> | CatalogOfferCreateWithoutProviderInput[] | CatalogOfferUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: CatalogOfferCreateOrConnectWithoutProviderInput | CatalogOfferCreateOrConnectWithoutProviderInput[]
    createMany?: CatalogOfferCreateManyProviderInputEnvelope
    connect?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
  }

  export type OrderCreateNestedManyWithoutProviderInput = {
    create?: XOR<OrderCreateWithoutProviderInput, OrderUncheckedCreateWithoutProviderInput> | OrderCreateWithoutProviderInput[] | OrderUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutProviderInput | OrderCreateOrConnectWithoutProviderInput[]
    createMany?: OrderCreateManyProviderInputEnvelope
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
  }

  export type OfferBlockCreateNestedManyWithoutProviderInput = {
    create?: XOR<OfferBlockCreateWithoutProviderInput, OfferBlockUncheckedCreateWithoutProviderInput> | OfferBlockCreateWithoutProviderInput[] | OfferBlockUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: OfferBlockCreateOrConnectWithoutProviderInput | OfferBlockCreateOrConnectWithoutProviderInput[]
    createMany?: OfferBlockCreateManyProviderInputEnvelope
    connect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
  }

  export type CatalogItemUncheckedCreateNestedManyWithoutProviderInput = {
    create?: XOR<CatalogItemCreateWithoutProviderInput, CatalogItemUncheckedCreateWithoutProviderInput> | CatalogItemCreateWithoutProviderInput[] | CatalogItemUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: CatalogItemCreateOrConnectWithoutProviderInput | CatalogItemCreateOrConnectWithoutProviderInput[]
    createMany?: CatalogItemCreateManyProviderInputEnvelope
    connect?: CatalogItemWhereUniqueInput | CatalogItemWhereUniqueInput[]
  }

  export type CatalogOfferUncheckedCreateNestedManyWithoutProviderInput = {
    create?: XOR<CatalogOfferCreateWithoutProviderInput, CatalogOfferUncheckedCreateWithoutProviderInput> | CatalogOfferCreateWithoutProviderInput[] | CatalogOfferUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: CatalogOfferCreateOrConnectWithoutProviderInput | CatalogOfferCreateOrConnectWithoutProviderInput[]
    createMany?: CatalogOfferCreateManyProviderInputEnvelope
    connect?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
  }

  export type OrderUncheckedCreateNestedManyWithoutProviderInput = {
    create?: XOR<OrderCreateWithoutProviderInput, OrderUncheckedCreateWithoutProviderInput> | OrderCreateWithoutProviderInput[] | OrderUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutProviderInput | OrderCreateOrConnectWithoutProviderInput[]
    createMany?: OrderCreateManyProviderInputEnvelope
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
  }

  export type OfferBlockUncheckedCreateNestedManyWithoutProviderInput = {
    create?: XOR<OfferBlockCreateWithoutProviderInput, OfferBlockUncheckedCreateWithoutProviderInput> | OfferBlockCreateWithoutProviderInput[] | OfferBlockUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: OfferBlockCreateOrConnectWithoutProviderInput | OfferBlockCreateOrConnectWithoutProviderInput[]
    createMany?: OfferBlockCreateManyProviderInputEnvelope
    connect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type CatalogItemUpdateManyWithoutProviderNestedInput = {
    create?: XOR<CatalogItemCreateWithoutProviderInput, CatalogItemUncheckedCreateWithoutProviderInput> | CatalogItemCreateWithoutProviderInput[] | CatalogItemUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: CatalogItemCreateOrConnectWithoutProviderInput | CatalogItemCreateOrConnectWithoutProviderInput[]
    upsert?: CatalogItemUpsertWithWhereUniqueWithoutProviderInput | CatalogItemUpsertWithWhereUniqueWithoutProviderInput[]
    createMany?: CatalogItemCreateManyProviderInputEnvelope
    set?: CatalogItemWhereUniqueInput | CatalogItemWhereUniqueInput[]
    disconnect?: CatalogItemWhereUniqueInput | CatalogItemWhereUniqueInput[]
    delete?: CatalogItemWhereUniqueInput | CatalogItemWhereUniqueInput[]
    connect?: CatalogItemWhereUniqueInput | CatalogItemWhereUniqueInput[]
    update?: CatalogItemUpdateWithWhereUniqueWithoutProviderInput | CatalogItemUpdateWithWhereUniqueWithoutProviderInput[]
    updateMany?: CatalogItemUpdateManyWithWhereWithoutProviderInput | CatalogItemUpdateManyWithWhereWithoutProviderInput[]
    deleteMany?: CatalogItemScalarWhereInput | CatalogItemScalarWhereInput[]
  }

  export type CatalogOfferUpdateManyWithoutProviderNestedInput = {
    create?: XOR<CatalogOfferCreateWithoutProviderInput, CatalogOfferUncheckedCreateWithoutProviderInput> | CatalogOfferCreateWithoutProviderInput[] | CatalogOfferUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: CatalogOfferCreateOrConnectWithoutProviderInput | CatalogOfferCreateOrConnectWithoutProviderInput[]
    upsert?: CatalogOfferUpsertWithWhereUniqueWithoutProviderInput | CatalogOfferUpsertWithWhereUniqueWithoutProviderInput[]
    createMany?: CatalogOfferCreateManyProviderInputEnvelope
    set?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
    disconnect?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
    delete?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
    connect?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
    update?: CatalogOfferUpdateWithWhereUniqueWithoutProviderInput | CatalogOfferUpdateWithWhereUniqueWithoutProviderInput[]
    updateMany?: CatalogOfferUpdateManyWithWhereWithoutProviderInput | CatalogOfferUpdateManyWithWhereWithoutProviderInput[]
    deleteMany?: CatalogOfferScalarWhereInput | CatalogOfferScalarWhereInput[]
  }

  export type OrderUpdateManyWithoutProviderNestedInput = {
    create?: XOR<OrderCreateWithoutProviderInput, OrderUncheckedCreateWithoutProviderInput> | OrderCreateWithoutProviderInput[] | OrderUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutProviderInput | OrderCreateOrConnectWithoutProviderInput[]
    upsert?: OrderUpsertWithWhereUniqueWithoutProviderInput | OrderUpsertWithWhereUniqueWithoutProviderInput[]
    createMany?: OrderCreateManyProviderInputEnvelope
    set?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    disconnect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    delete?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    update?: OrderUpdateWithWhereUniqueWithoutProviderInput | OrderUpdateWithWhereUniqueWithoutProviderInput[]
    updateMany?: OrderUpdateManyWithWhereWithoutProviderInput | OrderUpdateManyWithWhereWithoutProviderInput[]
    deleteMany?: OrderScalarWhereInput | OrderScalarWhereInput[]
  }

  export type OfferBlockUpdateManyWithoutProviderNestedInput = {
    create?: XOR<OfferBlockCreateWithoutProviderInput, OfferBlockUncheckedCreateWithoutProviderInput> | OfferBlockCreateWithoutProviderInput[] | OfferBlockUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: OfferBlockCreateOrConnectWithoutProviderInput | OfferBlockCreateOrConnectWithoutProviderInput[]
    upsert?: OfferBlockUpsertWithWhereUniqueWithoutProviderInput | OfferBlockUpsertWithWhereUniqueWithoutProviderInput[]
    createMany?: OfferBlockCreateManyProviderInputEnvelope
    set?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    disconnect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    delete?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    connect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    update?: OfferBlockUpdateWithWhereUniqueWithoutProviderInput | OfferBlockUpdateWithWhereUniqueWithoutProviderInput[]
    updateMany?: OfferBlockUpdateManyWithWhereWithoutProviderInput | OfferBlockUpdateManyWithWhereWithoutProviderInput[]
    deleteMany?: OfferBlockScalarWhereInput | OfferBlockScalarWhereInput[]
  }

  export type CatalogItemUncheckedUpdateManyWithoutProviderNestedInput = {
    create?: XOR<CatalogItemCreateWithoutProviderInput, CatalogItemUncheckedCreateWithoutProviderInput> | CatalogItemCreateWithoutProviderInput[] | CatalogItemUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: CatalogItemCreateOrConnectWithoutProviderInput | CatalogItemCreateOrConnectWithoutProviderInput[]
    upsert?: CatalogItemUpsertWithWhereUniqueWithoutProviderInput | CatalogItemUpsertWithWhereUniqueWithoutProviderInput[]
    createMany?: CatalogItemCreateManyProviderInputEnvelope
    set?: CatalogItemWhereUniqueInput | CatalogItemWhereUniqueInput[]
    disconnect?: CatalogItemWhereUniqueInput | CatalogItemWhereUniqueInput[]
    delete?: CatalogItemWhereUniqueInput | CatalogItemWhereUniqueInput[]
    connect?: CatalogItemWhereUniqueInput | CatalogItemWhereUniqueInput[]
    update?: CatalogItemUpdateWithWhereUniqueWithoutProviderInput | CatalogItemUpdateWithWhereUniqueWithoutProviderInput[]
    updateMany?: CatalogItemUpdateManyWithWhereWithoutProviderInput | CatalogItemUpdateManyWithWhereWithoutProviderInput[]
    deleteMany?: CatalogItemScalarWhereInput | CatalogItemScalarWhereInput[]
  }

  export type CatalogOfferUncheckedUpdateManyWithoutProviderNestedInput = {
    create?: XOR<CatalogOfferCreateWithoutProviderInput, CatalogOfferUncheckedCreateWithoutProviderInput> | CatalogOfferCreateWithoutProviderInput[] | CatalogOfferUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: CatalogOfferCreateOrConnectWithoutProviderInput | CatalogOfferCreateOrConnectWithoutProviderInput[]
    upsert?: CatalogOfferUpsertWithWhereUniqueWithoutProviderInput | CatalogOfferUpsertWithWhereUniqueWithoutProviderInput[]
    createMany?: CatalogOfferCreateManyProviderInputEnvelope
    set?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
    disconnect?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
    delete?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
    connect?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
    update?: CatalogOfferUpdateWithWhereUniqueWithoutProviderInput | CatalogOfferUpdateWithWhereUniqueWithoutProviderInput[]
    updateMany?: CatalogOfferUpdateManyWithWhereWithoutProviderInput | CatalogOfferUpdateManyWithWhereWithoutProviderInput[]
    deleteMany?: CatalogOfferScalarWhereInput | CatalogOfferScalarWhereInput[]
  }

  export type OrderUncheckedUpdateManyWithoutProviderNestedInput = {
    create?: XOR<OrderCreateWithoutProviderInput, OrderUncheckedCreateWithoutProviderInput> | OrderCreateWithoutProviderInput[] | OrderUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutProviderInput | OrderCreateOrConnectWithoutProviderInput[]
    upsert?: OrderUpsertWithWhereUniqueWithoutProviderInput | OrderUpsertWithWhereUniqueWithoutProviderInput[]
    createMany?: OrderCreateManyProviderInputEnvelope
    set?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    disconnect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    delete?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    update?: OrderUpdateWithWhereUniqueWithoutProviderInput | OrderUpdateWithWhereUniqueWithoutProviderInput[]
    updateMany?: OrderUpdateManyWithWhereWithoutProviderInput | OrderUpdateManyWithWhereWithoutProviderInput[]
    deleteMany?: OrderScalarWhereInput | OrderScalarWhereInput[]
  }

  export type OfferBlockUncheckedUpdateManyWithoutProviderNestedInput = {
    create?: XOR<OfferBlockCreateWithoutProviderInput, OfferBlockUncheckedCreateWithoutProviderInput> | OfferBlockCreateWithoutProviderInput[] | OfferBlockUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: OfferBlockCreateOrConnectWithoutProviderInput | OfferBlockCreateOrConnectWithoutProviderInput[]
    upsert?: OfferBlockUpsertWithWhereUniqueWithoutProviderInput | OfferBlockUpsertWithWhereUniqueWithoutProviderInput[]
    createMany?: OfferBlockCreateManyProviderInputEnvelope
    set?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    disconnect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    delete?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    connect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    update?: OfferBlockUpdateWithWhereUniqueWithoutProviderInput | OfferBlockUpdateWithWhereUniqueWithoutProviderInput[]
    updateMany?: OfferBlockUpdateManyWithWhereWithoutProviderInput | OfferBlockUpdateManyWithWhereWithoutProviderInput[]
    deleteMany?: OfferBlockScalarWhereInput | OfferBlockScalarWhereInput[]
  }

  export type ProviderCreateNestedOneWithoutItemsInput = {
    create?: XOR<ProviderCreateWithoutItemsInput, ProviderUncheckedCreateWithoutItemsInput>
    connectOrCreate?: ProviderCreateOrConnectWithoutItemsInput
    connect?: ProviderWhereUniqueInput
  }

  export type CatalogOfferCreateNestedManyWithoutItemInput = {
    create?: XOR<CatalogOfferCreateWithoutItemInput, CatalogOfferUncheckedCreateWithoutItemInput> | CatalogOfferCreateWithoutItemInput[] | CatalogOfferUncheckedCreateWithoutItemInput[]
    connectOrCreate?: CatalogOfferCreateOrConnectWithoutItemInput | CatalogOfferCreateOrConnectWithoutItemInput[]
    createMany?: CatalogOfferCreateManyItemInputEnvelope
    connect?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
  }

  export type OfferBlockCreateNestedManyWithoutItemInput = {
    create?: XOR<OfferBlockCreateWithoutItemInput, OfferBlockUncheckedCreateWithoutItemInput> | OfferBlockCreateWithoutItemInput[] | OfferBlockUncheckedCreateWithoutItemInput[]
    connectOrCreate?: OfferBlockCreateOrConnectWithoutItemInput | OfferBlockCreateOrConnectWithoutItemInput[]
    createMany?: OfferBlockCreateManyItemInputEnvelope
    connect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
  }

  export type CatalogOfferUncheckedCreateNestedManyWithoutItemInput = {
    create?: XOR<CatalogOfferCreateWithoutItemInput, CatalogOfferUncheckedCreateWithoutItemInput> | CatalogOfferCreateWithoutItemInput[] | CatalogOfferUncheckedCreateWithoutItemInput[]
    connectOrCreate?: CatalogOfferCreateOrConnectWithoutItemInput | CatalogOfferCreateOrConnectWithoutItemInput[]
    createMany?: CatalogOfferCreateManyItemInputEnvelope
    connect?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
  }

  export type OfferBlockUncheckedCreateNestedManyWithoutItemInput = {
    create?: XOR<OfferBlockCreateWithoutItemInput, OfferBlockUncheckedCreateWithoutItemInput> | OfferBlockCreateWithoutItemInput[] | OfferBlockUncheckedCreateWithoutItemInput[]
    connectOrCreate?: OfferBlockCreateOrConnectWithoutItemInput | OfferBlockCreateOrConnectWithoutItemInput[]
    createMany?: OfferBlockCreateManyItemInputEnvelope
    connect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type ProviderUpdateOneRequiredWithoutItemsNestedInput = {
    create?: XOR<ProviderCreateWithoutItemsInput, ProviderUncheckedCreateWithoutItemsInput>
    connectOrCreate?: ProviderCreateOrConnectWithoutItemsInput
    upsert?: ProviderUpsertWithoutItemsInput
    connect?: ProviderWhereUniqueInput
    update?: XOR<XOR<ProviderUpdateToOneWithWhereWithoutItemsInput, ProviderUpdateWithoutItemsInput>, ProviderUncheckedUpdateWithoutItemsInput>
  }

  export type CatalogOfferUpdateManyWithoutItemNestedInput = {
    create?: XOR<CatalogOfferCreateWithoutItemInput, CatalogOfferUncheckedCreateWithoutItemInput> | CatalogOfferCreateWithoutItemInput[] | CatalogOfferUncheckedCreateWithoutItemInput[]
    connectOrCreate?: CatalogOfferCreateOrConnectWithoutItemInput | CatalogOfferCreateOrConnectWithoutItemInput[]
    upsert?: CatalogOfferUpsertWithWhereUniqueWithoutItemInput | CatalogOfferUpsertWithWhereUniqueWithoutItemInput[]
    createMany?: CatalogOfferCreateManyItemInputEnvelope
    set?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
    disconnect?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
    delete?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
    connect?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
    update?: CatalogOfferUpdateWithWhereUniqueWithoutItemInput | CatalogOfferUpdateWithWhereUniqueWithoutItemInput[]
    updateMany?: CatalogOfferUpdateManyWithWhereWithoutItemInput | CatalogOfferUpdateManyWithWhereWithoutItemInput[]
    deleteMany?: CatalogOfferScalarWhereInput | CatalogOfferScalarWhereInput[]
  }

  export type OfferBlockUpdateManyWithoutItemNestedInput = {
    create?: XOR<OfferBlockCreateWithoutItemInput, OfferBlockUncheckedCreateWithoutItemInput> | OfferBlockCreateWithoutItemInput[] | OfferBlockUncheckedCreateWithoutItemInput[]
    connectOrCreate?: OfferBlockCreateOrConnectWithoutItemInput | OfferBlockCreateOrConnectWithoutItemInput[]
    upsert?: OfferBlockUpsertWithWhereUniqueWithoutItemInput | OfferBlockUpsertWithWhereUniqueWithoutItemInput[]
    createMany?: OfferBlockCreateManyItemInputEnvelope
    set?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    disconnect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    delete?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    connect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    update?: OfferBlockUpdateWithWhereUniqueWithoutItemInput | OfferBlockUpdateWithWhereUniqueWithoutItemInput[]
    updateMany?: OfferBlockUpdateManyWithWhereWithoutItemInput | OfferBlockUpdateManyWithWhereWithoutItemInput[]
    deleteMany?: OfferBlockScalarWhereInput | OfferBlockScalarWhereInput[]
  }

  export type CatalogOfferUncheckedUpdateManyWithoutItemNestedInput = {
    create?: XOR<CatalogOfferCreateWithoutItemInput, CatalogOfferUncheckedCreateWithoutItemInput> | CatalogOfferCreateWithoutItemInput[] | CatalogOfferUncheckedCreateWithoutItemInput[]
    connectOrCreate?: CatalogOfferCreateOrConnectWithoutItemInput | CatalogOfferCreateOrConnectWithoutItemInput[]
    upsert?: CatalogOfferUpsertWithWhereUniqueWithoutItemInput | CatalogOfferUpsertWithWhereUniqueWithoutItemInput[]
    createMany?: CatalogOfferCreateManyItemInputEnvelope
    set?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
    disconnect?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
    delete?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
    connect?: CatalogOfferWhereUniqueInput | CatalogOfferWhereUniqueInput[]
    update?: CatalogOfferUpdateWithWhereUniqueWithoutItemInput | CatalogOfferUpdateWithWhereUniqueWithoutItemInput[]
    updateMany?: CatalogOfferUpdateManyWithWhereWithoutItemInput | CatalogOfferUpdateManyWithWhereWithoutItemInput[]
    deleteMany?: CatalogOfferScalarWhereInput | CatalogOfferScalarWhereInput[]
  }

  export type OfferBlockUncheckedUpdateManyWithoutItemNestedInput = {
    create?: XOR<OfferBlockCreateWithoutItemInput, OfferBlockUncheckedCreateWithoutItemInput> | OfferBlockCreateWithoutItemInput[] | OfferBlockUncheckedCreateWithoutItemInput[]
    connectOrCreate?: OfferBlockCreateOrConnectWithoutItemInput | OfferBlockCreateOrConnectWithoutItemInput[]
    upsert?: OfferBlockUpsertWithWhereUniqueWithoutItemInput | OfferBlockUpsertWithWhereUniqueWithoutItemInput[]
    createMany?: OfferBlockCreateManyItemInputEnvelope
    set?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    disconnect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    delete?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    connect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    update?: OfferBlockUpdateWithWhereUniqueWithoutItemInput | OfferBlockUpdateWithWhereUniqueWithoutItemInput[]
    updateMany?: OfferBlockUpdateManyWithWhereWithoutItemInput | OfferBlockUpdateManyWithWhereWithoutItemInput[]
    deleteMany?: OfferBlockScalarWhereInput | OfferBlockScalarWhereInput[]
  }

  export type CatalogItemCreateNestedOneWithoutOffersInput = {
    create?: XOR<CatalogItemCreateWithoutOffersInput, CatalogItemUncheckedCreateWithoutOffersInput>
    connectOrCreate?: CatalogItemCreateOrConnectWithoutOffersInput
    connect?: CatalogItemWhereUniqueInput
  }

  export type ProviderCreateNestedOneWithoutOffersInput = {
    create?: XOR<ProviderCreateWithoutOffersInput, ProviderUncheckedCreateWithoutOffersInput>
    connectOrCreate?: ProviderCreateOrConnectWithoutOffersInput
    connect?: ProviderWhereUniqueInput
  }

  export type OfferBlockCreateNestedManyWithoutOfferInput = {
    create?: XOR<OfferBlockCreateWithoutOfferInput, OfferBlockUncheckedCreateWithoutOfferInput> | OfferBlockCreateWithoutOfferInput[] | OfferBlockUncheckedCreateWithoutOfferInput[]
    connectOrCreate?: OfferBlockCreateOrConnectWithoutOfferInput | OfferBlockCreateOrConnectWithoutOfferInput[]
    createMany?: OfferBlockCreateManyOfferInputEnvelope
    connect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
  }

  export type OrderCreateNestedManyWithoutSelectedOfferInput = {
    create?: XOR<OrderCreateWithoutSelectedOfferInput, OrderUncheckedCreateWithoutSelectedOfferInput> | OrderCreateWithoutSelectedOfferInput[] | OrderUncheckedCreateWithoutSelectedOfferInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutSelectedOfferInput | OrderCreateOrConnectWithoutSelectedOfferInput[]
    createMany?: OrderCreateManySelectedOfferInputEnvelope
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
  }

  export type OfferBlockUncheckedCreateNestedManyWithoutOfferInput = {
    create?: XOR<OfferBlockCreateWithoutOfferInput, OfferBlockUncheckedCreateWithoutOfferInput> | OfferBlockCreateWithoutOfferInput[] | OfferBlockUncheckedCreateWithoutOfferInput[]
    connectOrCreate?: OfferBlockCreateOrConnectWithoutOfferInput | OfferBlockCreateOrConnectWithoutOfferInput[]
    createMany?: OfferBlockCreateManyOfferInputEnvelope
    connect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
  }

  export type OrderUncheckedCreateNestedManyWithoutSelectedOfferInput = {
    create?: XOR<OrderCreateWithoutSelectedOfferInput, OrderUncheckedCreateWithoutSelectedOfferInput> | OrderCreateWithoutSelectedOfferInput[] | OrderUncheckedCreateWithoutSelectedOfferInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutSelectedOfferInput | OrderCreateOrConnectWithoutSelectedOfferInput[]
    createMany?: OrderCreateManySelectedOfferInputEnvelope
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
  }

  export type CatalogItemUpdateOneRequiredWithoutOffersNestedInput = {
    create?: XOR<CatalogItemCreateWithoutOffersInput, CatalogItemUncheckedCreateWithoutOffersInput>
    connectOrCreate?: CatalogItemCreateOrConnectWithoutOffersInput
    upsert?: CatalogItemUpsertWithoutOffersInput
    connect?: CatalogItemWhereUniqueInput
    update?: XOR<XOR<CatalogItemUpdateToOneWithWhereWithoutOffersInput, CatalogItemUpdateWithoutOffersInput>, CatalogItemUncheckedUpdateWithoutOffersInput>
  }

  export type ProviderUpdateOneRequiredWithoutOffersNestedInput = {
    create?: XOR<ProviderCreateWithoutOffersInput, ProviderUncheckedCreateWithoutOffersInput>
    connectOrCreate?: ProviderCreateOrConnectWithoutOffersInput
    upsert?: ProviderUpsertWithoutOffersInput
    connect?: ProviderWhereUniqueInput
    update?: XOR<XOR<ProviderUpdateToOneWithWhereWithoutOffersInput, ProviderUpdateWithoutOffersInput>, ProviderUncheckedUpdateWithoutOffersInput>
  }

  export type OfferBlockUpdateManyWithoutOfferNestedInput = {
    create?: XOR<OfferBlockCreateWithoutOfferInput, OfferBlockUncheckedCreateWithoutOfferInput> | OfferBlockCreateWithoutOfferInput[] | OfferBlockUncheckedCreateWithoutOfferInput[]
    connectOrCreate?: OfferBlockCreateOrConnectWithoutOfferInput | OfferBlockCreateOrConnectWithoutOfferInput[]
    upsert?: OfferBlockUpsertWithWhereUniqueWithoutOfferInput | OfferBlockUpsertWithWhereUniqueWithoutOfferInput[]
    createMany?: OfferBlockCreateManyOfferInputEnvelope
    set?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    disconnect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    delete?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    connect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    update?: OfferBlockUpdateWithWhereUniqueWithoutOfferInput | OfferBlockUpdateWithWhereUniqueWithoutOfferInput[]
    updateMany?: OfferBlockUpdateManyWithWhereWithoutOfferInput | OfferBlockUpdateManyWithWhereWithoutOfferInput[]
    deleteMany?: OfferBlockScalarWhereInput | OfferBlockScalarWhereInput[]
  }

  export type OrderUpdateManyWithoutSelectedOfferNestedInput = {
    create?: XOR<OrderCreateWithoutSelectedOfferInput, OrderUncheckedCreateWithoutSelectedOfferInput> | OrderCreateWithoutSelectedOfferInput[] | OrderUncheckedCreateWithoutSelectedOfferInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutSelectedOfferInput | OrderCreateOrConnectWithoutSelectedOfferInput[]
    upsert?: OrderUpsertWithWhereUniqueWithoutSelectedOfferInput | OrderUpsertWithWhereUniqueWithoutSelectedOfferInput[]
    createMany?: OrderCreateManySelectedOfferInputEnvelope
    set?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    disconnect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    delete?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    update?: OrderUpdateWithWhereUniqueWithoutSelectedOfferInput | OrderUpdateWithWhereUniqueWithoutSelectedOfferInput[]
    updateMany?: OrderUpdateManyWithWhereWithoutSelectedOfferInput | OrderUpdateManyWithWhereWithoutSelectedOfferInput[]
    deleteMany?: OrderScalarWhereInput | OrderScalarWhereInput[]
  }

  export type OfferBlockUncheckedUpdateManyWithoutOfferNestedInput = {
    create?: XOR<OfferBlockCreateWithoutOfferInput, OfferBlockUncheckedCreateWithoutOfferInput> | OfferBlockCreateWithoutOfferInput[] | OfferBlockUncheckedCreateWithoutOfferInput[]
    connectOrCreate?: OfferBlockCreateOrConnectWithoutOfferInput | OfferBlockCreateOrConnectWithoutOfferInput[]
    upsert?: OfferBlockUpsertWithWhereUniqueWithoutOfferInput | OfferBlockUpsertWithWhereUniqueWithoutOfferInput[]
    createMany?: OfferBlockCreateManyOfferInputEnvelope
    set?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    disconnect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    delete?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    connect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    update?: OfferBlockUpdateWithWhereUniqueWithoutOfferInput | OfferBlockUpdateWithWhereUniqueWithoutOfferInput[]
    updateMany?: OfferBlockUpdateManyWithWhereWithoutOfferInput | OfferBlockUpdateManyWithWhereWithoutOfferInput[]
    deleteMany?: OfferBlockScalarWhereInput | OfferBlockScalarWhereInput[]
  }

  export type OrderUncheckedUpdateManyWithoutSelectedOfferNestedInput = {
    create?: XOR<OrderCreateWithoutSelectedOfferInput, OrderUncheckedCreateWithoutSelectedOfferInput> | OrderCreateWithoutSelectedOfferInput[] | OrderUncheckedCreateWithoutSelectedOfferInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutSelectedOfferInput | OrderCreateOrConnectWithoutSelectedOfferInput[]
    upsert?: OrderUpsertWithWhereUniqueWithoutSelectedOfferInput | OrderUpsertWithWhereUniqueWithoutSelectedOfferInput[]
    createMany?: OrderCreateManySelectedOfferInputEnvelope
    set?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    disconnect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    delete?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    update?: OrderUpdateWithWhereUniqueWithoutSelectedOfferInput | OrderUpdateWithWhereUniqueWithoutSelectedOfferInput[]
    updateMany?: OrderUpdateManyWithWhereWithoutSelectedOfferInput | OrderUpdateManyWithWhereWithoutSelectedOfferInput[]
    deleteMany?: OrderScalarWhereInput | OrderScalarWhereInput[]
  }

  export type CatalogOfferCreateNestedOneWithoutBlocksInput = {
    create?: XOR<CatalogOfferCreateWithoutBlocksInput, CatalogOfferUncheckedCreateWithoutBlocksInput>
    connectOrCreate?: CatalogOfferCreateOrConnectWithoutBlocksInput
    connect?: CatalogOfferWhereUniqueInput
  }

  export type CatalogItemCreateNestedOneWithoutBlocksInput = {
    create?: XOR<CatalogItemCreateWithoutBlocksInput, CatalogItemUncheckedCreateWithoutBlocksInput>
    connectOrCreate?: CatalogItemCreateOrConnectWithoutBlocksInput
    connect?: CatalogItemWhereUniqueInput
  }

  export type ProviderCreateNestedOneWithoutBlocksInput = {
    create?: XOR<ProviderCreateWithoutBlocksInput, ProviderUncheckedCreateWithoutBlocksInput>
    connectOrCreate?: ProviderCreateOrConnectWithoutBlocksInput
    connect?: ProviderWhereUniqueInput
  }

  export type OrderCreateNestedOneWithoutBlocksInput = {
    create?: XOR<OrderCreateWithoutBlocksInput, OrderUncheckedCreateWithoutBlocksInput>
    connectOrCreate?: OrderCreateOrConnectWithoutBlocksInput
    connect?: OrderWhereUniqueInput
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type CatalogOfferUpdateOneRequiredWithoutBlocksNestedInput = {
    create?: XOR<CatalogOfferCreateWithoutBlocksInput, CatalogOfferUncheckedCreateWithoutBlocksInput>
    connectOrCreate?: CatalogOfferCreateOrConnectWithoutBlocksInput
    upsert?: CatalogOfferUpsertWithoutBlocksInput
    connect?: CatalogOfferWhereUniqueInput
    update?: XOR<XOR<CatalogOfferUpdateToOneWithWhereWithoutBlocksInput, CatalogOfferUpdateWithoutBlocksInput>, CatalogOfferUncheckedUpdateWithoutBlocksInput>
  }

  export type CatalogItemUpdateOneRequiredWithoutBlocksNestedInput = {
    create?: XOR<CatalogItemCreateWithoutBlocksInput, CatalogItemUncheckedCreateWithoutBlocksInput>
    connectOrCreate?: CatalogItemCreateOrConnectWithoutBlocksInput
    upsert?: CatalogItemUpsertWithoutBlocksInput
    connect?: CatalogItemWhereUniqueInput
    update?: XOR<XOR<CatalogItemUpdateToOneWithWhereWithoutBlocksInput, CatalogItemUpdateWithoutBlocksInput>, CatalogItemUncheckedUpdateWithoutBlocksInput>
  }

  export type ProviderUpdateOneRequiredWithoutBlocksNestedInput = {
    create?: XOR<ProviderCreateWithoutBlocksInput, ProviderUncheckedCreateWithoutBlocksInput>
    connectOrCreate?: ProviderCreateOrConnectWithoutBlocksInput
    upsert?: ProviderUpsertWithoutBlocksInput
    connect?: ProviderWhereUniqueInput
    update?: XOR<XOR<ProviderUpdateToOneWithWhereWithoutBlocksInput, ProviderUpdateWithoutBlocksInput>, ProviderUncheckedUpdateWithoutBlocksInput>
  }

  export type OrderUpdateOneWithoutBlocksNestedInput = {
    create?: XOR<OrderCreateWithoutBlocksInput, OrderUncheckedCreateWithoutBlocksInput>
    connectOrCreate?: OrderCreateOrConnectWithoutBlocksInput
    upsert?: OrderUpsertWithoutBlocksInput
    disconnect?: OrderWhereInput | boolean
    delete?: OrderWhereInput | boolean
    connect?: OrderWhereUniqueInput
    update?: XOR<XOR<OrderUpdateToOneWithWhereWithoutBlocksInput, OrderUpdateWithoutBlocksInput>, OrderUncheckedUpdateWithoutBlocksInput>
  }

  export type ProviderCreateNestedOneWithoutOrdersInput = {
    create?: XOR<ProviderCreateWithoutOrdersInput, ProviderUncheckedCreateWithoutOrdersInput>
    connectOrCreate?: ProviderCreateOrConnectWithoutOrdersInput
    connect?: ProviderWhereUniqueInput
  }

  export type CatalogOfferCreateNestedOneWithoutOrdersInput = {
    create?: XOR<CatalogOfferCreateWithoutOrdersInput, CatalogOfferUncheckedCreateWithoutOrdersInput>
    connectOrCreate?: CatalogOfferCreateOrConnectWithoutOrdersInput
    connect?: CatalogOfferWhereUniqueInput
  }

  export type OfferBlockCreateNestedManyWithoutOrderInput = {
    create?: XOR<OfferBlockCreateWithoutOrderInput, OfferBlockUncheckedCreateWithoutOrderInput> | OfferBlockCreateWithoutOrderInput[] | OfferBlockUncheckedCreateWithoutOrderInput[]
    connectOrCreate?: OfferBlockCreateOrConnectWithoutOrderInput | OfferBlockCreateOrConnectWithoutOrderInput[]
    createMany?: OfferBlockCreateManyOrderInputEnvelope
    connect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
  }

  export type OfferBlockUncheckedCreateNestedManyWithoutOrderInput = {
    create?: XOR<OfferBlockCreateWithoutOrderInput, OfferBlockUncheckedCreateWithoutOrderInput> | OfferBlockCreateWithoutOrderInput[] | OfferBlockUncheckedCreateWithoutOrderInput[]
    connectOrCreate?: OfferBlockCreateOrConnectWithoutOrderInput | OfferBlockCreateOrConnectWithoutOrderInput[]
    createMany?: OfferBlockCreateManyOrderInputEnvelope
    connect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ProviderUpdateOneWithoutOrdersNestedInput = {
    create?: XOR<ProviderCreateWithoutOrdersInput, ProviderUncheckedCreateWithoutOrdersInput>
    connectOrCreate?: ProviderCreateOrConnectWithoutOrdersInput
    upsert?: ProviderUpsertWithoutOrdersInput
    disconnect?: ProviderWhereInput | boolean
    delete?: ProviderWhereInput | boolean
    connect?: ProviderWhereUniqueInput
    update?: XOR<XOR<ProviderUpdateToOneWithWhereWithoutOrdersInput, ProviderUpdateWithoutOrdersInput>, ProviderUncheckedUpdateWithoutOrdersInput>
  }

  export type CatalogOfferUpdateOneWithoutOrdersNestedInput = {
    create?: XOR<CatalogOfferCreateWithoutOrdersInput, CatalogOfferUncheckedCreateWithoutOrdersInput>
    connectOrCreate?: CatalogOfferCreateOrConnectWithoutOrdersInput
    upsert?: CatalogOfferUpsertWithoutOrdersInput
    disconnect?: CatalogOfferWhereInput | boolean
    delete?: CatalogOfferWhereInput | boolean
    connect?: CatalogOfferWhereUniqueInput
    update?: XOR<XOR<CatalogOfferUpdateToOneWithWhereWithoutOrdersInput, CatalogOfferUpdateWithoutOrdersInput>, CatalogOfferUncheckedUpdateWithoutOrdersInput>
  }

  export type OfferBlockUpdateManyWithoutOrderNestedInput = {
    create?: XOR<OfferBlockCreateWithoutOrderInput, OfferBlockUncheckedCreateWithoutOrderInput> | OfferBlockCreateWithoutOrderInput[] | OfferBlockUncheckedCreateWithoutOrderInput[]
    connectOrCreate?: OfferBlockCreateOrConnectWithoutOrderInput | OfferBlockCreateOrConnectWithoutOrderInput[]
    upsert?: OfferBlockUpsertWithWhereUniqueWithoutOrderInput | OfferBlockUpsertWithWhereUniqueWithoutOrderInput[]
    createMany?: OfferBlockCreateManyOrderInputEnvelope
    set?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    disconnect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    delete?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    connect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    update?: OfferBlockUpdateWithWhereUniqueWithoutOrderInput | OfferBlockUpdateWithWhereUniqueWithoutOrderInput[]
    updateMany?: OfferBlockUpdateManyWithWhereWithoutOrderInput | OfferBlockUpdateManyWithWhereWithoutOrderInput[]
    deleteMany?: OfferBlockScalarWhereInput | OfferBlockScalarWhereInput[]
  }

  export type OfferBlockUncheckedUpdateManyWithoutOrderNestedInput = {
    create?: XOR<OfferBlockCreateWithoutOrderInput, OfferBlockUncheckedCreateWithoutOrderInput> | OfferBlockCreateWithoutOrderInput[] | OfferBlockUncheckedCreateWithoutOrderInput[]
    connectOrCreate?: OfferBlockCreateOrConnectWithoutOrderInput | OfferBlockCreateOrConnectWithoutOrderInput[]
    upsert?: OfferBlockUpsertWithWhereUniqueWithoutOrderInput | OfferBlockUpsertWithWhereUniqueWithoutOrderInput[]
    createMany?: OfferBlockCreateManyOrderInputEnvelope
    set?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    disconnect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    delete?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    connect?: OfferBlockWhereUniqueInput | OfferBlockWhereUniqueInput[]
    update?: OfferBlockUpdateWithWhereUniqueWithoutOrderInput | OfferBlockUpdateWithWhereUniqueWithoutOrderInput[]
    updateMany?: OfferBlockUpdateManyWithWhereWithoutOrderInput | OfferBlockUpdateManyWithWhereWithoutOrderInput[]
    deleteMany?: OfferBlockScalarWhereInput | OfferBlockScalarWhereInput[]
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type CatalogItemCreateWithoutProviderInput = {
    id: string
    sourceType: string
    deliveryMode: string
    availableQty: number
    meterId?: string | null
    productionWindowsJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
    offers?: CatalogOfferCreateNestedManyWithoutItemInput
    blocks?: OfferBlockCreateNestedManyWithoutItemInput
  }

  export type CatalogItemUncheckedCreateWithoutProviderInput = {
    id: string
    sourceType: string
    deliveryMode: string
    availableQty: number
    meterId?: string | null
    productionWindowsJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
    offers?: CatalogOfferUncheckedCreateNestedManyWithoutItemInput
    blocks?: OfferBlockUncheckedCreateNestedManyWithoutItemInput
  }

  export type CatalogItemCreateOrConnectWithoutProviderInput = {
    where: CatalogItemWhereUniqueInput
    create: XOR<CatalogItemCreateWithoutProviderInput, CatalogItemUncheckedCreateWithoutProviderInput>
  }

  export type CatalogItemCreateManyProviderInputEnvelope = {
    data: CatalogItemCreateManyProviderInput | CatalogItemCreateManyProviderInput[]
    skipDuplicates?: boolean
  }

  export type CatalogOfferCreateWithoutProviderInput = {
    id: string
    priceValue: number
    currency?: string
    maxQty: number
    timeWindowStart: Date | string
    timeWindowEnd: Date | string
    pricingModel?: string
    settlementType?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    item: CatalogItemCreateNestedOneWithoutOffersInput
    blocks?: OfferBlockCreateNestedManyWithoutOfferInput
    orders?: OrderCreateNestedManyWithoutSelectedOfferInput
  }

  export type CatalogOfferUncheckedCreateWithoutProviderInput = {
    id: string
    itemId: string
    priceValue: number
    currency?: string
    maxQty: number
    timeWindowStart: Date | string
    timeWindowEnd: Date | string
    pricingModel?: string
    settlementType?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    blocks?: OfferBlockUncheckedCreateNestedManyWithoutOfferInput
    orders?: OrderUncheckedCreateNestedManyWithoutSelectedOfferInput
  }

  export type CatalogOfferCreateOrConnectWithoutProviderInput = {
    where: CatalogOfferWhereUniqueInput
    create: XOR<CatalogOfferCreateWithoutProviderInput, CatalogOfferUncheckedCreateWithoutProviderInput>
  }

  export type CatalogOfferCreateManyProviderInputEnvelope = {
    data: CatalogOfferCreateManyProviderInput | CatalogOfferCreateManyProviderInput[]
    skipDuplicates?: boolean
  }

  export type OrderCreateWithoutProviderInput = {
    id: string
    transactionId: string
    status?: string
    totalQty?: number | null
    totalPrice?: number | null
    currency?: string | null
    itemsJson: string
    quoteJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
    selectedOffer?: CatalogOfferCreateNestedOneWithoutOrdersInput
    blocks?: OfferBlockCreateNestedManyWithoutOrderInput
  }

  export type OrderUncheckedCreateWithoutProviderInput = {
    id: string
    transactionId: string
    selectedOfferId?: string | null
    status?: string
    totalQty?: number | null
    totalPrice?: number | null
    currency?: string | null
    itemsJson: string
    quoteJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
    blocks?: OfferBlockUncheckedCreateNestedManyWithoutOrderInput
  }

  export type OrderCreateOrConnectWithoutProviderInput = {
    where: OrderWhereUniqueInput
    create: XOR<OrderCreateWithoutProviderInput, OrderUncheckedCreateWithoutProviderInput>
  }

  export type OrderCreateManyProviderInputEnvelope = {
    data: OrderCreateManyProviderInput | OrderCreateManyProviderInput[]
    skipDuplicates?: boolean
  }

  export type OfferBlockCreateWithoutProviderInput = {
    id: string
    status?: string
    transactionId?: string | null
    priceValue: number
    currency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reservedAt?: Date | string | null
    soldAt?: Date | string | null
    offer: CatalogOfferCreateNestedOneWithoutBlocksInput
    item: CatalogItemCreateNestedOneWithoutBlocksInput
    order?: OrderCreateNestedOneWithoutBlocksInput
  }

  export type OfferBlockUncheckedCreateWithoutProviderInput = {
    id: string
    offerId: string
    itemId: string
    status?: string
    orderId?: string | null
    transactionId?: string | null
    priceValue: number
    currency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reservedAt?: Date | string | null
    soldAt?: Date | string | null
  }

  export type OfferBlockCreateOrConnectWithoutProviderInput = {
    where: OfferBlockWhereUniqueInput
    create: XOR<OfferBlockCreateWithoutProviderInput, OfferBlockUncheckedCreateWithoutProviderInput>
  }

  export type OfferBlockCreateManyProviderInputEnvelope = {
    data: OfferBlockCreateManyProviderInput | OfferBlockCreateManyProviderInput[]
    skipDuplicates?: boolean
  }

  export type CatalogItemUpsertWithWhereUniqueWithoutProviderInput = {
    where: CatalogItemWhereUniqueInput
    update: XOR<CatalogItemUpdateWithoutProviderInput, CatalogItemUncheckedUpdateWithoutProviderInput>
    create: XOR<CatalogItemCreateWithoutProviderInput, CatalogItemUncheckedCreateWithoutProviderInput>
  }

  export type CatalogItemUpdateWithWhereUniqueWithoutProviderInput = {
    where: CatalogItemWhereUniqueInput
    data: XOR<CatalogItemUpdateWithoutProviderInput, CatalogItemUncheckedUpdateWithoutProviderInput>
  }

  export type CatalogItemUpdateManyWithWhereWithoutProviderInput = {
    where: CatalogItemScalarWhereInput
    data: XOR<CatalogItemUpdateManyMutationInput, CatalogItemUncheckedUpdateManyWithoutProviderInput>
  }

  export type CatalogItemScalarWhereInput = {
    AND?: CatalogItemScalarWhereInput | CatalogItemScalarWhereInput[]
    OR?: CatalogItemScalarWhereInput[]
    NOT?: CatalogItemScalarWhereInput | CatalogItemScalarWhereInput[]
    id?: StringFilter<"CatalogItem"> | string
    providerId?: StringFilter<"CatalogItem"> | string
    sourceType?: StringFilter<"CatalogItem"> | string
    deliveryMode?: StringFilter<"CatalogItem"> | string
    availableQty?: FloatFilter<"CatalogItem"> | number
    meterId?: StringNullableFilter<"CatalogItem"> | string | null
    productionWindowsJson?: StringFilter<"CatalogItem"> | string
    createdAt?: DateTimeFilter<"CatalogItem"> | Date | string
    updatedAt?: DateTimeFilter<"CatalogItem"> | Date | string
  }

  export type CatalogOfferUpsertWithWhereUniqueWithoutProviderInput = {
    where: CatalogOfferWhereUniqueInput
    update: XOR<CatalogOfferUpdateWithoutProviderInput, CatalogOfferUncheckedUpdateWithoutProviderInput>
    create: XOR<CatalogOfferCreateWithoutProviderInput, CatalogOfferUncheckedCreateWithoutProviderInput>
  }

  export type CatalogOfferUpdateWithWhereUniqueWithoutProviderInput = {
    where: CatalogOfferWhereUniqueInput
    data: XOR<CatalogOfferUpdateWithoutProviderInput, CatalogOfferUncheckedUpdateWithoutProviderInput>
  }

  export type CatalogOfferUpdateManyWithWhereWithoutProviderInput = {
    where: CatalogOfferScalarWhereInput
    data: XOR<CatalogOfferUpdateManyMutationInput, CatalogOfferUncheckedUpdateManyWithoutProviderInput>
  }

  export type CatalogOfferScalarWhereInput = {
    AND?: CatalogOfferScalarWhereInput | CatalogOfferScalarWhereInput[]
    OR?: CatalogOfferScalarWhereInput[]
    NOT?: CatalogOfferScalarWhereInput | CatalogOfferScalarWhereInput[]
    id?: StringFilter<"CatalogOffer"> | string
    itemId?: StringFilter<"CatalogOffer"> | string
    providerId?: StringFilter<"CatalogOffer"> | string
    priceValue?: FloatFilter<"CatalogOffer"> | number
    currency?: StringFilter<"CatalogOffer"> | string
    maxQty?: FloatFilter<"CatalogOffer"> | number
    timeWindowStart?: DateTimeFilter<"CatalogOffer"> | Date | string
    timeWindowEnd?: DateTimeFilter<"CatalogOffer"> | Date | string
    pricingModel?: StringFilter<"CatalogOffer"> | string
    settlementType?: StringFilter<"CatalogOffer"> | string
    createdAt?: DateTimeFilter<"CatalogOffer"> | Date | string
    updatedAt?: DateTimeFilter<"CatalogOffer"> | Date | string
  }

  export type OrderUpsertWithWhereUniqueWithoutProviderInput = {
    where: OrderWhereUniqueInput
    update: XOR<OrderUpdateWithoutProviderInput, OrderUncheckedUpdateWithoutProviderInput>
    create: XOR<OrderCreateWithoutProviderInput, OrderUncheckedCreateWithoutProviderInput>
  }

  export type OrderUpdateWithWhereUniqueWithoutProviderInput = {
    where: OrderWhereUniqueInput
    data: XOR<OrderUpdateWithoutProviderInput, OrderUncheckedUpdateWithoutProviderInput>
  }

  export type OrderUpdateManyWithWhereWithoutProviderInput = {
    where: OrderScalarWhereInput
    data: XOR<OrderUpdateManyMutationInput, OrderUncheckedUpdateManyWithoutProviderInput>
  }

  export type OrderScalarWhereInput = {
    AND?: OrderScalarWhereInput | OrderScalarWhereInput[]
    OR?: OrderScalarWhereInput[]
    NOT?: OrderScalarWhereInput | OrderScalarWhereInput[]
    id?: StringFilter<"Order"> | string
    transactionId?: StringFilter<"Order"> | string
    providerId?: StringNullableFilter<"Order"> | string | null
    selectedOfferId?: StringNullableFilter<"Order"> | string | null
    status?: StringFilter<"Order"> | string
    totalQty?: FloatNullableFilter<"Order"> | number | null
    totalPrice?: FloatNullableFilter<"Order"> | number | null
    currency?: StringNullableFilter<"Order"> | string | null
    itemsJson?: StringFilter<"Order"> | string
    quoteJson?: StringFilter<"Order"> | string
    createdAt?: DateTimeFilter<"Order"> | Date | string
    updatedAt?: DateTimeFilter<"Order"> | Date | string
  }

  export type OfferBlockUpsertWithWhereUniqueWithoutProviderInput = {
    where: OfferBlockWhereUniqueInput
    update: XOR<OfferBlockUpdateWithoutProviderInput, OfferBlockUncheckedUpdateWithoutProviderInput>
    create: XOR<OfferBlockCreateWithoutProviderInput, OfferBlockUncheckedCreateWithoutProviderInput>
  }

  export type OfferBlockUpdateWithWhereUniqueWithoutProviderInput = {
    where: OfferBlockWhereUniqueInput
    data: XOR<OfferBlockUpdateWithoutProviderInput, OfferBlockUncheckedUpdateWithoutProviderInput>
  }

  export type OfferBlockUpdateManyWithWhereWithoutProviderInput = {
    where: OfferBlockScalarWhereInput
    data: XOR<OfferBlockUpdateManyMutationInput, OfferBlockUncheckedUpdateManyWithoutProviderInput>
  }

  export type OfferBlockScalarWhereInput = {
    AND?: OfferBlockScalarWhereInput | OfferBlockScalarWhereInput[]
    OR?: OfferBlockScalarWhereInput[]
    NOT?: OfferBlockScalarWhereInput | OfferBlockScalarWhereInput[]
    id?: StringFilter<"OfferBlock"> | string
    offerId?: StringFilter<"OfferBlock"> | string
    itemId?: StringFilter<"OfferBlock"> | string
    providerId?: StringFilter<"OfferBlock"> | string
    status?: StringFilter<"OfferBlock"> | string
    orderId?: StringNullableFilter<"OfferBlock"> | string | null
    transactionId?: StringNullableFilter<"OfferBlock"> | string | null
    priceValue?: FloatFilter<"OfferBlock"> | number
    currency?: StringFilter<"OfferBlock"> | string
    createdAt?: DateTimeFilter<"OfferBlock"> | Date | string
    updatedAt?: DateTimeFilter<"OfferBlock"> | Date | string
    reservedAt?: DateTimeNullableFilter<"OfferBlock"> | Date | string | null
    soldAt?: DateTimeNullableFilter<"OfferBlock"> | Date | string | null
  }

  export type ProviderCreateWithoutItemsInput = {
    id: string
    name: string
    trustScore?: number
    totalOrders?: number
    successfulOrders?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    offers?: CatalogOfferCreateNestedManyWithoutProviderInput
    orders?: OrderCreateNestedManyWithoutProviderInput
    blocks?: OfferBlockCreateNestedManyWithoutProviderInput
  }

  export type ProviderUncheckedCreateWithoutItemsInput = {
    id: string
    name: string
    trustScore?: number
    totalOrders?: number
    successfulOrders?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    offers?: CatalogOfferUncheckedCreateNestedManyWithoutProviderInput
    orders?: OrderUncheckedCreateNestedManyWithoutProviderInput
    blocks?: OfferBlockUncheckedCreateNestedManyWithoutProviderInput
  }

  export type ProviderCreateOrConnectWithoutItemsInput = {
    where: ProviderWhereUniqueInput
    create: XOR<ProviderCreateWithoutItemsInput, ProviderUncheckedCreateWithoutItemsInput>
  }

  export type CatalogOfferCreateWithoutItemInput = {
    id: string
    priceValue: number
    currency?: string
    maxQty: number
    timeWindowStart: Date | string
    timeWindowEnd: Date | string
    pricingModel?: string
    settlementType?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    provider: ProviderCreateNestedOneWithoutOffersInput
    blocks?: OfferBlockCreateNestedManyWithoutOfferInput
    orders?: OrderCreateNestedManyWithoutSelectedOfferInput
  }

  export type CatalogOfferUncheckedCreateWithoutItemInput = {
    id: string
    providerId: string
    priceValue: number
    currency?: string
    maxQty: number
    timeWindowStart: Date | string
    timeWindowEnd: Date | string
    pricingModel?: string
    settlementType?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    blocks?: OfferBlockUncheckedCreateNestedManyWithoutOfferInput
    orders?: OrderUncheckedCreateNestedManyWithoutSelectedOfferInput
  }

  export type CatalogOfferCreateOrConnectWithoutItemInput = {
    where: CatalogOfferWhereUniqueInput
    create: XOR<CatalogOfferCreateWithoutItemInput, CatalogOfferUncheckedCreateWithoutItemInput>
  }

  export type CatalogOfferCreateManyItemInputEnvelope = {
    data: CatalogOfferCreateManyItemInput | CatalogOfferCreateManyItemInput[]
    skipDuplicates?: boolean
  }

  export type OfferBlockCreateWithoutItemInput = {
    id: string
    status?: string
    transactionId?: string | null
    priceValue: number
    currency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reservedAt?: Date | string | null
    soldAt?: Date | string | null
    offer: CatalogOfferCreateNestedOneWithoutBlocksInput
    provider: ProviderCreateNestedOneWithoutBlocksInput
    order?: OrderCreateNestedOneWithoutBlocksInput
  }

  export type OfferBlockUncheckedCreateWithoutItemInput = {
    id: string
    offerId: string
    providerId: string
    status?: string
    orderId?: string | null
    transactionId?: string | null
    priceValue: number
    currency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reservedAt?: Date | string | null
    soldAt?: Date | string | null
  }

  export type OfferBlockCreateOrConnectWithoutItemInput = {
    where: OfferBlockWhereUniqueInput
    create: XOR<OfferBlockCreateWithoutItemInput, OfferBlockUncheckedCreateWithoutItemInput>
  }

  export type OfferBlockCreateManyItemInputEnvelope = {
    data: OfferBlockCreateManyItemInput | OfferBlockCreateManyItemInput[]
    skipDuplicates?: boolean
  }

  export type ProviderUpsertWithoutItemsInput = {
    update: XOR<ProviderUpdateWithoutItemsInput, ProviderUncheckedUpdateWithoutItemsInput>
    create: XOR<ProviderCreateWithoutItemsInput, ProviderUncheckedCreateWithoutItemsInput>
    where?: ProviderWhereInput
  }

  export type ProviderUpdateToOneWithWhereWithoutItemsInput = {
    where?: ProviderWhereInput
    data: XOR<ProviderUpdateWithoutItemsInput, ProviderUncheckedUpdateWithoutItemsInput>
  }

  export type ProviderUpdateWithoutItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trustScore?: FloatFieldUpdateOperationsInput | number
    totalOrders?: IntFieldUpdateOperationsInput | number
    successfulOrders?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    offers?: CatalogOfferUpdateManyWithoutProviderNestedInput
    orders?: OrderUpdateManyWithoutProviderNestedInput
    blocks?: OfferBlockUpdateManyWithoutProviderNestedInput
  }

  export type ProviderUncheckedUpdateWithoutItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trustScore?: FloatFieldUpdateOperationsInput | number
    totalOrders?: IntFieldUpdateOperationsInput | number
    successfulOrders?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    offers?: CatalogOfferUncheckedUpdateManyWithoutProviderNestedInput
    orders?: OrderUncheckedUpdateManyWithoutProviderNestedInput
    blocks?: OfferBlockUncheckedUpdateManyWithoutProviderNestedInput
  }

  export type CatalogOfferUpsertWithWhereUniqueWithoutItemInput = {
    where: CatalogOfferWhereUniqueInput
    update: XOR<CatalogOfferUpdateWithoutItemInput, CatalogOfferUncheckedUpdateWithoutItemInput>
    create: XOR<CatalogOfferCreateWithoutItemInput, CatalogOfferUncheckedCreateWithoutItemInput>
  }

  export type CatalogOfferUpdateWithWhereUniqueWithoutItemInput = {
    where: CatalogOfferWhereUniqueInput
    data: XOR<CatalogOfferUpdateWithoutItemInput, CatalogOfferUncheckedUpdateWithoutItemInput>
  }

  export type CatalogOfferUpdateManyWithWhereWithoutItemInput = {
    where: CatalogOfferScalarWhereInput
    data: XOR<CatalogOfferUpdateManyMutationInput, CatalogOfferUncheckedUpdateManyWithoutItemInput>
  }

  export type OfferBlockUpsertWithWhereUniqueWithoutItemInput = {
    where: OfferBlockWhereUniqueInput
    update: XOR<OfferBlockUpdateWithoutItemInput, OfferBlockUncheckedUpdateWithoutItemInput>
    create: XOR<OfferBlockCreateWithoutItemInput, OfferBlockUncheckedCreateWithoutItemInput>
  }

  export type OfferBlockUpdateWithWhereUniqueWithoutItemInput = {
    where: OfferBlockWhereUniqueInput
    data: XOR<OfferBlockUpdateWithoutItemInput, OfferBlockUncheckedUpdateWithoutItemInput>
  }

  export type OfferBlockUpdateManyWithWhereWithoutItemInput = {
    where: OfferBlockScalarWhereInput
    data: XOR<OfferBlockUpdateManyMutationInput, OfferBlockUncheckedUpdateManyWithoutItemInput>
  }

  export type CatalogItemCreateWithoutOffersInput = {
    id: string
    sourceType: string
    deliveryMode: string
    availableQty: number
    meterId?: string | null
    productionWindowsJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
    provider: ProviderCreateNestedOneWithoutItemsInput
    blocks?: OfferBlockCreateNestedManyWithoutItemInput
  }

  export type CatalogItemUncheckedCreateWithoutOffersInput = {
    id: string
    providerId: string
    sourceType: string
    deliveryMode: string
    availableQty: number
    meterId?: string | null
    productionWindowsJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
    blocks?: OfferBlockUncheckedCreateNestedManyWithoutItemInput
  }

  export type CatalogItemCreateOrConnectWithoutOffersInput = {
    where: CatalogItemWhereUniqueInput
    create: XOR<CatalogItemCreateWithoutOffersInput, CatalogItemUncheckedCreateWithoutOffersInput>
  }

  export type ProviderCreateWithoutOffersInput = {
    id: string
    name: string
    trustScore?: number
    totalOrders?: number
    successfulOrders?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: CatalogItemCreateNestedManyWithoutProviderInput
    orders?: OrderCreateNestedManyWithoutProviderInput
    blocks?: OfferBlockCreateNestedManyWithoutProviderInput
  }

  export type ProviderUncheckedCreateWithoutOffersInput = {
    id: string
    name: string
    trustScore?: number
    totalOrders?: number
    successfulOrders?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: CatalogItemUncheckedCreateNestedManyWithoutProviderInput
    orders?: OrderUncheckedCreateNestedManyWithoutProviderInput
    blocks?: OfferBlockUncheckedCreateNestedManyWithoutProviderInput
  }

  export type ProviderCreateOrConnectWithoutOffersInput = {
    where: ProviderWhereUniqueInput
    create: XOR<ProviderCreateWithoutOffersInput, ProviderUncheckedCreateWithoutOffersInput>
  }

  export type OfferBlockCreateWithoutOfferInput = {
    id: string
    status?: string
    transactionId?: string | null
    priceValue: number
    currency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reservedAt?: Date | string | null
    soldAt?: Date | string | null
    item: CatalogItemCreateNestedOneWithoutBlocksInput
    provider: ProviderCreateNestedOneWithoutBlocksInput
    order?: OrderCreateNestedOneWithoutBlocksInput
  }

  export type OfferBlockUncheckedCreateWithoutOfferInput = {
    id: string
    itemId: string
    providerId: string
    status?: string
    orderId?: string | null
    transactionId?: string | null
    priceValue: number
    currency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reservedAt?: Date | string | null
    soldAt?: Date | string | null
  }

  export type OfferBlockCreateOrConnectWithoutOfferInput = {
    where: OfferBlockWhereUniqueInput
    create: XOR<OfferBlockCreateWithoutOfferInput, OfferBlockUncheckedCreateWithoutOfferInput>
  }

  export type OfferBlockCreateManyOfferInputEnvelope = {
    data: OfferBlockCreateManyOfferInput | OfferBlockCreateManyOfferInput[]
    skipDuplicates?: boolean
  }

  export type OrderCreateWithoutSelectedOfferInput = {
    id: string
    transactionId: string
    status?: string
    totalQty?: number | null
    totalPrice?: number | null
    currency?: string | null
    itemsJson: string
    quoteJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
    provider?: ProviderCreateNestedOneWithoutOrdersInput
    blocks?: OfferBlockCreateNestedManyWithoutOrderInput
  }

  export type OrderUncheckedCreateWithoutSelectedOfferInput = {
    id: string
    transactionId: string
    providerId?: string | null
    status?: string
    totalQty?: number | null
    totalPrice?: number | null
    currency?: string | null
    itemsJson: string
    quoteJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
    blocks?: OfferBlockUncheckedCreateNestedManyWithoutOrderInput
  }

  export type OrderCreateOrConnectWithoutSelectedOfferInput = {
    where: OrderWhereUniqueInput
    create: XOR<OrderCreateWithoutSelectedOfferInput, OrderUncheckedCreateWithoutSelectedOfferInput>
  }

  export type OrderCreateManySelectedOfferInputEnvelope = {
    data: OrderCreateManySelectedOfferInput | OrderCreateManySelectedOfferInput[]
    skipDuplicates?: boolean
  }

  export type CatalogItemUpsertWithoutOffersInput = {
    update: XOR<CatalogItemUpdateWithoutOffersInput, CatalogItemUncheckedUpdateWithoutOffersInput>
    create: XOR<CatalogItemCreateWithoutOffersInput, CatalogItemUncheckedCreateWithoutOffersInput>
    where?: CatalogItemWhereInput
  }

  export type CatalogItemUpdateToOneWithWhereWithoutOffersInput = {
    where?: CatalogItemWhereInput
    data: XOR<CatalogItemUpdateWithoutOffersInput, CatalogItemUncheckedUpdateWithoutOffersInput>
  }

  export type CatalogItemUpdateWithoutOffersInput = {
    id?: StringFieldUpdateOperationsInput | string
    sourceType?: StringFieldUpdateOperationsInput | string
    deliveryMode?: StringFieldUpdateOperationsInput | string
    availableQty?: FloatFieldUpdateOperationsInput | number
    meterId?: NullableStringFieldUpdateOperationsInput | string | null
    productionWindowsJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    provider?: ProviderUpdateOneRequiredWithoutItemsNestedInput
    blocks?: OfferBlockUpdateManyWithoutItemNestedInput
  }

  export type CatalogItemUncheckedUpdateWithoutOffersInput = {
    id?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    sourceType?: StringFieldUpdateOperationsInput | string
    deliveryMode?: StringFieldUpdateOperationsInput | string
    availableQty?: FloatFieldUpdateOperationsInput | number
    meterId?: NullableStringFieldUpdateOperationsInput | string | null
    productionWindowsJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    blocks?: OfferBlockUncheckedUpdateManyWithoutItemNestedInput
  }

  export type ProviderUpsertWithoutOffersInput = {
    update: XOR<ProviderUpdateWithoutOffersInput, ProviderUncheckedUpdateWithoutOffersInput>
    create: XOR<ProviderCreateWithoutOffersInput, ProviderUncheckedCreateWithoutOffersInput>
    where?: ProviderWhereInput
  }

  export type ProviderUpdateToOneWithWhereWithoutOffersInput = {
    where?: ProviderWhereInput
    data: XOR<ProviderUpdateWithoutOffersInput, ProviderUncheckedUpdateWithoutOffersInput>
  }

  export type ProviderUpdateWithoutOffersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trustScore?: FloatFieldUpdateOperationsInput | number
    totalOrders?: IntFieldUpdateOperationsInput | number
    successfulOrders?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: CatalogItemUpdateManyWithoutProviderNestedInput
    orders?: OrderUpdateManyWithoutProviderNestedInput
    blocks?: OfferBlockUpdateManyWithoutProviderNestedInput
  }

  export type ProviderUncheckedUpdateWithoutOffersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trustScore?: FloatFieldUpdateOperationsInput | number
    totalOrders?: IntFieldUpdateOperationsInput | number
    successfulOrders?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: CatalogItemUncheckedUpdateManyWithoutProviderNestedInput
    orders?: OrderUncheckedUpdateManyWithoutProviderNestedInput
    blocks?: OfferBlockUncheckedUpdateManyWithoutProviderNestedInput
  }

  export type OfferBlockUpsertWithWhereUniqueWithoutOfferInput = {
    where: OfferBlockWhereUniqueInput
    update: XOR<OfferBlockUpdateWithoutOfferInput, OfferBlockUncheckedUpdateWithoutOfferInput>
    create: XOR<OfferBlockCreateWithoutOfferInput, OfferBlockUncheckedCreateWithoutOfferInput>
  }

  export type OfferBlockUpdateWithWhereUniqueWithoutOfferInput = {
    where: OfferBlockWhereUniqueInput
    data: XOR<OfferBlockUpdateWithoutOfferInput, OfferBlockUncheckedUpdateWithoutOfferInput>
  }

  export type OfferBlockUpdateManyWithWhereWithoutOfferInput = {
    where: OfferBlockScalarWhereInput
    data: XOR<OfferBlockUpdateManyMutationInput, OfferBlockUncheckedUpdateManyWithoutOfferInput>
  }

  export type OrderUpsertWithWhereUniqueWithoutSelectedOfferInput = {
    where: OrderWhereUniqueInput
    update: XOR<OrderUpdateWithoutSelectedOfferInput, OrderUncheckedUpdateWithoutSelectedOfferInput>
    create: XOR<OrderCreateWithoutSelectedOfferInput, OrderUncheckedCreateWithoutSelectedOfferInput>
  }

  export type OrderUpdateWithWhereUniqueWithoutSelectedOfferInput = {
    where: OrderWhereUniqueInput
    data: XOR<OrderUpdateWithoutSelectedOfferInput, OrderUncheckedUpdateWithoutSelectedOfferInput>
  }

  export type OrderUpdateManyWithWhereWithoutSelectedOfferInput = {
    where: OrderScalarWhereInput
    data: XOR<OrderUpdateManyMutationInput, OrderUncheckedUpdateManyWithoutSelectedOfferInput>
  }

  export type CatalogOfferCreateWithoutBlocksInput = {
    id: string
    priceValue: number
    currency?: string
    maxQty: number
    timeWindowStart: Date | string
    timeWindowEnd: Date | string
    pricingModel?: string
    settlementType?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    item: CatalogItemCreateNestedOneWithoutOffersInput
    provider: ProviderCreateNestedOneWithoutOffersInput
    orders?: OrderCreateNestedManyWithoutSelectedOfferInput
  }

  export type CatalogOfferUncheckedCreateWithoutBlocksInput = {
    id: string
    itemId: string
    providerId: string
    priceValue: number
    currency?: string
    maxQty: number
    timeWindowStart: Date | string
    timeWindowEnd: Date | string
    pricingModel?: string
    settlementType?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    orders?: OrderUncheckedCreateNestedManyWithoutSelectedOfferInput
  }

  export type CatalogOfferCreateOrConnectWithoutBlocksInput = {
    where: CatalogOfferWhereUniqueInput
    create: XOR<CatalogOfferCreateWithoutBlocksInput, CatalogOfferUncheckedCreateWithoutBlocksInput>
  }

  export type CatalogItemCreateWithoutBlocksInput = {
    id: string
    sourceType: string
    deliveryMode: string
    availableQty: number
    meterId?: string | null
    productionWindowsJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
    provider: ProviderCreateNestedOneWithoutItemsInput
    offers?: CatalogOfferCreateNestedManyWithoutItemInput
  }

  export type CatalogItemUncheckedCreateWithoutBlocksInput = {
    id: string
    providerId: string
    sourceType: string
    deliveryMode: string
    availableQty: number
    meterId?: string | null
    productionWindowsJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
    offers?: CatalogOfferUncheckedCreateNestedManyWithoutItemInput
  }

  export type CatalogItemCreateOrConnectWithoutBlocksInput = {
    where: CatalogItemWhereUniqueInput
    create: XOR<CatalogItemCreateWithoutBlocksInput, CatalogItemUncheckedCreateWithoutBlocksInput>
  }

  export type ProviderCreateWithoutBlocksInput = {
    id: string
    name: string
    trustScore?: number
    totalOrders?: number
    successfulOrders?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: CatalogItemCreateNestedManyWithoutProviderInput
    offers?: CatalogOfferCreateNestedManyWithoutProviderInput
    orders?: OrderCreateNestedManyWithoutProviderInput
  }

  export type ProviderUncheckedCreateWithoutBlocksInput = {
    id: string
    name: string
    trustScore?: number
    totalOrders?: number
    successfulOrders?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: CatalogItemUncheckedCreateNestedManyWithoutProviderInput
    offers?: CatalogOfferUncheckedCreateNestedManyWithoutProviderInput
    orders?: OrderUncheckedCreateNestedManyWithoutProviderInput
  }

  export type ProviderCreateOrConnectWithoutBlocksInput = {
    where: ProviderWhereUniqueInput
    create: XOR<ProviderCreateWithoutBlocksInput, ProviderUncheckedCreateWithoutBlocksInput>
  }

  export type OrderCreateWithoutBlocksInput = {
    id: string
    transactionId: string
    status?: string
    totalQty?: number | null
    totalPrice?: number | null
    currency?: string | null
    itemsJson: string
    quoteJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
    provider?: ProviderCreateNestedOneWithoutOrdersInput
    selectedOffer?: CatalogOfferCreateNestedOneWithoutOrdersInput
  }

  export type OrderUncheckedCreateWithoutBlocksInput = {
    id: string
    transactionId: string
    providerId?: string | null
    selectedOfferId?: string | null
    status?: string
    totalQty?: number | null
    totalPrice?: number | null
    currency?: string | null
    itemsJson: string
    quoteJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OrderCreateOrConnectWithoutBlocksInput = {
    where: OrderWhereUniqueInput
    create: XOR<OrderCreateWithoutBlocksInput, OrderUncheckedCreateWithoutBlocksInput>
  }

  export type CatalogOfferUpsertWithoutBlocksInput = {
    update: XOR<CatalogOfferUpdateWithoutBlocksInput, CatalogOfferUncheckedUpdateWithoutBlocksInput>
    create: XOR<CatalogOfferCreateWithoutBlocksInput, CatalogOfferUncheckedCreateWithoutBlocksInput>
    where?: CatalogOfferWhereInput
  }

  export type CatalogOfferUpdateToOneWithWhereWithoutBlocksInput = {
    where?: CatalogOfferWhereInput
    data: XOR<CatalogOfferUpdateWithoutBlocksInput, CatalogOfferUncheckedUpdateWithoutBlocksInput>
  }

  export type CatalogOfferUpdateWithoutBlocksInput = {
    id?: StringFieldUpdateOperationsInput | string
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    maxQty?: FloatFieldUpdateOperationsInput | number
    timeWindowStart?: DateTimeFieldUpdateOperationsInput | Date | string
    timeWindowEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    pricingModel?: StringFieldUpdateOperationsInput | string
    settlementType?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    item?: CatalogItemUpdateOneRequiredWithoutOffersNestedInput
    provider?: ProviderUpdateOneRequiredWithoutOffersNestedInput
    orders?: OrderUpdateManyWithoutSelectedOfferNestedInput
  }

  export type CatalogOfferUncheckedUpdateWithoutBlocksInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    maxQty?: FloatFieldUpdateOperationsInput | number
    timeWindowStart?: DateTimeFieldUpdateOperationsInput | Date | string
    timeWindowEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    pricingModel?: StringFieldUpdateOperationsInput | string
    settlementType?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    orders?: OrderUncheckedUpdateManyWithoutSelectedOfferNestedInput
  }

  export type CatalogItemUpsertWithoutBlocksInput = {
    update: XOR<CatalogItemUpdateWithoutBlocksInput, CatalogItemUncheckedUpdateWithoutBlocksInput>
    create: XOR<CatalogItemCreateWithoutBlocksInput, CatalogItemUncheckedCreateWithoutBlocksInput>
    where?: CatalogItemWhereInput
  }

  export type CatalogItemUpdateToOneWithWhereWithoutBlocksInput = {
    where?: CatalogItemWhereInput
    data: XOR<CatalogItemUpdateWithoutBlocksInput, CatalogItemUncheckedUpdateWithoutBlocksInput>
  }

  export type CatalogItemUpdateWithoutBlocksInput = {
    id?: StringFieldUpdateOperationsInput | string
    sourceType?: StringFieldUpdateOperationsInput | string
    deliveryMode?: StringFieldUpdateOperationsInput | string
    availableQty?: FloatFieldUpdateOperationsInput | number
    meterId?: NullableStringFieldUpdateOperationsInput | string | null
    productionWindowsJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    provider?: ProviderUpdateOneRequiredWithoutItemsNestedInput
    offers?: CatalogOfferUpdateManyWithoutItemNestedInput
  }

  export type CatalogItemUncheckedUpdateWithoutBlocksInput = {
    id?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    sourceType?: StringFieldUpdateOperationsInput | string
    deliveryMode?: StringFieldUpdateOperationsInput | string
    availableQty?: FloatFieldUpdateOperationsInput | number
    meterId?: NullableStringFieldUpdateOperationsInput | string | null
    productionWindowsJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    offers?: CatalogOfferUncheckedUpdateManyWithoutItemNestedInput
  }

  export type ProviderUpsertWithoutBlocksInput = {
    update: XOR<ProviderUpdateWithoutBlocksInput, ProviderUncheckedUpdateWithoutBlocksInput>
    create: XOR<ProviderCreateWithoutBlocksInput, ProviderUncheckedCreateWithoutBlocksInput>
    where?: ProviderWhereInput
  }

  export type ProviderUpdateToOneWithWhereWithoutBlocksInput = {
    where?: ProviderWhereInput
    data: XOR<ProviderUpdateWithoutBlocksInput, ProviderUncheckedUpdateWithoutBlocksInput>
  }

  export type ProviderUpdateWithoutBlocksInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trustScore?: FloatFieldUpdateOperationsInput | number
    totalOrders?: IntFieldUpdateOperationsInput | number
    successfulOrders?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: CatalogItemUpdateManyWithoutProviderNestedInput
    offers?: CatalogOfferUpdateManyWithoutProviderNestedInput
    orders?: OrderUpdateManyWithoutProviderNestedInput
  }

  export type ProviderUncheckedUpdateWithoutBlocksInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trustScore?: FloatFieldUpdateOperationsInput | number
    totalOrders?: IntFieldUpdateOperationsInput | number
    successfulOrders?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: CatalogItemUncheckedUpdateManyWithoutProviderNestedInput
    offers?: CatalogOfferUncheckedUpdateManyWithoutProviderNestedInput
    orders?: OrderUncheckedUpdateManyWithoutProviderNestedInput
  }

  export type OrderUpsertWithoutBlocksInput = {
    update: XOR<OrderUpdateWithoutBlocksInput, OrderUncheckedUpdateWithoutBlocksInput>
    create: XOR<OrderCreateWithoutBlocksInput, OrderUncheckedCreateWithoutBlocksInput>
    where?: OrderWhereInput
  }

  export type OrderUpdateToOneWithWhereWithoutBlocksInput = {
    where?: OrderWhereInput
    data: XOR<OrderUpdateWithoutBlocksInput, OrderUncheckedUpdateWithoutBlocksInput>
  }

  export type OrderUpdateWithoutBlocksInput = {
    id?: StringFieldUpdateOperationsInput | string
    transactionId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    totalQty?: NullableFloatFieldUpdateOperationsInput | number | null
    totalPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    itemsJson?: StringFieldUpdateOperationsInput | string
    quoteJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    provider?: ProviderUpdateOneWithoutOrdersNestedInput
    selectedOffer?: CatalogOfferUpdateOneWithoutOrdersNestedInput
  }

  export type OrderUncheckedUpdateWithoutBlocksInput = {
    id?: StringFieldUpdateOperationsInput | string
    transactionId?: StringFieldUpdateOperationsInput | string
    providerId?: NullableStringFieldUpdateOperationsInput | string | null
    selectedOfferId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    totalQty?: NullableFloatFieldUpdateOperationsInput | number | null
    totalPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    itemsJson?: StringFieldUpdateOperationsInput | string
    quoteJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProviderCreateWithoutOrdersInput = {
    id: string
    name: string
    trustScore?: number
    totalOrders?: number
    successfulOrders?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: CatalogItemCreateNestedManyWithoutProviderInput
    offers?: CatalogOfferCreateNestedManyWithoutProviderInput
    blocks?: OfferBlockCreateNestedManyWithoutProviderInput
  }

  export type ProviderUncheckedCreateWithoutOrdersInput = {
    id: string
    name: string
    trustScore?: number
    totalOrders?: number
    successfulOrders?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: CatalogItemUncheckedCreateNestedManyWithoutProviderInput
    offers?: CatalogOfferUncheckedCreateNestedManyWithoutProviderInput
    blocks?: OfferBlockUncheckedCreateNestedManyWithoutProviderInput
  }

  export type ProviderCreateOrConnectWithoutOrdersInput = {
    where: ProviderWhereUniqueInput
    create: XOR<ProviderCreateWithoutOrdersInput, ProviderUncheckedCreateWithoutOrdersInput>
  }

  export type CatalogOfferCreateWithoutOrdersInput = {
    id: string
    priceValue: number
    currency?: string
    maxQty: number
    timeWindowStart: Date | string
    timeWindowEnd: Date | string
    pricingModel?: string
    settlementType?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    item: CatalogItemCreateNestedOneWithoutOffersInput
    provider: ProviderCreateNestedOneWithoutOffersInput
    blocks?: OfferBlockCreateNestedManyWithoutOfferInput
  }

  export type CatalogOfferUncheckedCreateWithoutOrdersInput = {
    id: string
    itemId: string
    providerId: string
    priceValue: number
    currency?: string
    maxQty: number
    timeWindowStart: Date | string
    timeWindowEnd: Date | string
    pricingModel?: string
    settlementType?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    blocks?: OfferBlockUncheckedCreateNestedManyWithoutOfferInput
  }

  export type CatalogOfferCreateOrConnectWithoutOrdersInput = {
    where: CatalogOfferWhereUniqueInput
    create: XOR<CatalogOfferCreateWithoutOrdersInput, CatalogOfferUncheckedCreateWithoutOrdersInput>
  }

  export type OfferBlockCreateWithoutOrderInput = {
    id: string
    status?: string
    transactionId?: string | null
    priceValue: number
    currency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reservedAt?: Date | string | null
    soldAt?: Date | string | null
    offer: CatalogOfferCreateNestedOneWithoutBlocksInput
    item: CatalogItemCreateNestedOneWithoutBlocksInput
    provider: ProviderCreateNestedOneWithoutBlocksInput
  }

  export type OfferBlockUncheckedCreateWithoutOrderInput = {
    id: string
    offerId: string
    itemId: string
    providerId: string
    status?: string
    transactionId?: string | null
    priceValue: number
    currency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reservedAt?: Date | string | null
    soldAt?: Date | string | null
  }

  export type OfferBlockCreateOrConnectWithoutOrderInput = {
    where: OfferBlockWhereUniqueInput
    create: XOR<OfferBlockCreateWithoutOrderInput, OfferBlockUncheckedCreateWithoutOrderInput>
  }

  export type OfferBlockCreateManyOrderInputEnvelope = {
    data: OfferBlockCreateManyOrderInput | OfferBlockCreateManyOrderInput[]
    skipDuplicates?: boolean
  }

  export type ProviderUpsertWithoutOrdersInput = {
    update: XOR<ProviderUpdateWithoutOrdersInput, ProviderUncheckedUpdateWithoutOrdersInput>
    create: XOR<ProviderCreateWithoutOrdersInput, ProviderUncheckedCreateWithoutOrdersInput>
    where?: ProviderWhereInput
  }

  export type ProviderUpdateToOneWithWhereWithoutOrdersInput = {
    where?: ProviderWhereInput
    data: XOR<ProviderUpdateWithoutOrdersInput, ProviderUncheckedUpdateWithoutOrdersInput>
  }

  export type ProviderUpdateWithoutOrdersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trustScore?: FloatFieldUpdateOperationsInput | number
    totalOrders?: IntFieldUpdateOperationsInput | number
    successfulOrders?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: CatalogItemUpdateManyWithoutProviderNestedInput
    offers?: CatalogOfferUpdateManyWithoutProviderNestedInput
    blocks?: OfferBlockUpdateManyWithoutProviderNestedInput
  }

  export type ProviderUncheckedUpdateWithoutOrdersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trustScore?: FloatFieldUpdateOperationsInput | number
    totalOrders?: IntFieldUpdateOperationsInput | number
    successfulOrders?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: CatalogItemUncheckedUpdateManyWithoutProviderNestedInput
    offers?: CatalogOfferUncheckedUpdateManyWithoutProviderNestedInput
    blocks?: OfferBlockUncheckedUpdateManyWithoutProviderNestedInput
  }

  export type CatalogOfferUpsertWithoutOrdersInput = {
    update: XOR<CatalogOfferUpdateWithoutOrdersInput, CatalogOfferUncheckedUpdateWithoutOrdersInput>
    create: XOR<CatalogOfferCreateWithoutOrdersInput, CatalogOfferUncheckedCreateWithoutOrdersInput>
    where?: CatalogOfferWhereInput
  }

  export type CatalogOfferUpdateToOneWithWhereWithoutOrdersInput = {
    where?: CatalogOfferWhereInput
    data: XOR<CatalogOfferUpdateWithoutOrdersInput, CatalogOfferUncheckedUpdateWithoutOrdersInput>
  }

  export type CatalogOfferUpdateWithoutOrdersInput = {
    id?: StringFieldUpdateOperationsInput | string
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    maxQty?: FloatFieldUpdateOperationsInput | number
    timeWindowStart?: DateTimeFieldUpdateOperationsInput | Date | string
    timeWindowEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    pricingModel?: StringFieldUpdateOperationsInput | string
    settlementType?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    item?: CatalogItemUpdateOneRequiredWithoutOffersNestedInput
    provider?: ProviderUpdateOneRequiredWithoutOffersNestedInput
    blocks?: OfferBlockUpdateManyWithoutOfferNestedInput
  }

  export type CatalogOfferUncheckedUpdateWithoutOrdersInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    maxQty?: FloatFieldUpdateOperationsInput | number
    timeWindowStart?: DateTimeFieldUpdateOperationsInput | Date | string
    timeWindowEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    pricingModel?: StringFieldUpdateOperationsInput | string
    settlementType?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    blocks?: OfferBlockUncheckedUpdateManyWithoutOfferNestedInput
  }

  export type OfferBlockUpsertWithWhereUniqueWithoutOrderInput = {
    where: OfferBlockWhereUniqueInput
    update: XOR<OfferBlockUpdateWithoutOrderInput, OfferBlockUncheckedUpdateWithoutOrderInput>
    create: XOR<OfferBlockCreateWithoutOrderInput, OfferBlockUncheckedCreateWithoutOrderInput>
  }

  export type OfferBlockUpdateWithWhereUniqueWithoutOrderInput = {
    where: OfferBlockWhereUniqueInput
    data: XOR<OfferBlockUpdateWithoutOrderInput, OfferBlockUncheckedUpdateWithoutOrderInput>
  }

  export type OfferBlockUpdateManyWithWhereWithoutOrderInput = {
    where: OfferBlockScalarWhereInput
    data: XOR<OfferBlockUpdateManyMutationInput, OfferBlockUncheckedUpdateManyWithoutOrderInput>
  }

  export type CatalogItemCreateManyProviderInput = {
    id: string
    sourceType: string
    deliveryMode: string
    availableQty: number
    meterId?: string | null
    productionWindowsJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CatalogOfferCreateManyProviderInput = {
    id: string
    itemId: string
    priceValue: number
    currency?: string
    maxQty: number
    timeWindowStart: Date | string
    timeWindowEnd: Date | string
    pricingModel?: string
    settlementType?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OrderCreateManyProviderInput = {
    id: string
    transactionId: string
    selectedOfferId?: string | null
    status?: string
    totalQty?: number | null
    totalPrice?: number | null
    currency?: string | null
    itemsJson: string
    quoteJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OfferBlockCreateManyProviderInput = {
    id: string
    offerId: string
    itemId: string
    status?: string
    orderId?: string | null
    transactionId?: string | null
    priceValue: number
    currency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reservedAt?: Date | string | null
    soldAt?: Date | string | null
  }

  export type CatalogItemUpdateWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    sourceType?: StringFieldUpdateOperationsInput | string
    deliveryMode?: StringFieldUpdateOperationsInput | string
    availableQty?: FloatFieldUpdateOperationsInput | number
    meterId?: NullableStringFieldUpdateOperationsInput | string | null
    productionWindowsJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    offers?: CatalogOfferUpdateManyWithoutItemNestedInput
    blocks?: OfferBlockUpdateManyWithoutItemNestedInput
  }

  export type CatalogItemUncheckedUpdateWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    sourceType?: StringFieldUpdateOperationsInput | string
    deliveryMode?: StringFieldUpdateOperationsInput | string
    availableQty?: FloatFieldUpdateOperationsInput | number
    meterId?: NullableStringFieldUpdateOperationsInput | string | null
    productionWindowsJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    offers?: CatalogOfferUncheckedUpdateManyWithoutItemNestedInput
    blocks?: OfferBlockUncheckedUpdateManyWithoutItemNestedInput
  }

  export type CatalogItemUncheckedUpdateManyWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    sourceType?: StringFieldUpdateOperationsInput | string
    deliveryMode?: StringFieldUpdateOperationsInput | string
    availableQty?: FloatFieldUpdateOperationsInput | number
    meterId?: NullableStringFieldUpdateOperationsInput | string | null
    productionWindowsJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CatalogOfferUpdateWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    maxQty?: FloatFieldUpdateOperationsInput | number
    timeWindowStart?: DateTimeFieldUpdateOperationsInput | Date | string
    timeWindowEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    pricingModel?: StringFieldUpdateOperationsInput | string
    settlementType?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    item?: CatalogItemUpdateOneRequiredWithoutOffersNestedInput
    blocks?: OfferBlockUpdateManyWithoutOfferNestedInput
    orders?: OrderUpdateManyWithoutSelectedOfferNestedInput
  }

  export type CatalogOfferUncheckedUpdateWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    maxQty?: FloatFieldUpdateOperationsInput | number
    timeWindowStart?: DateTimeFieldUpdateOperationsInput | Date | string
    timeWindowEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    pricingModel?: StringFieldUpdateOperationsInput | string
    settlementType?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    blocks?: OfferBlockUncheckedUpdateManyWithoutOfferNestedInput
    orders?: OrderUncheckedUpdateManyWithoutSelectedOfferNestedInput
  }

  export type CatalogOfferUncheckedUpdateManyWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    maxQty?: FloatFieldUpdateOperationsInput | number
    timeWindowStart?: DateTimeFieldUpdateOperationsInput | Date | string
    timeWindowEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    pricingModel?: StringFieldUpdateOperationsInput | string
    settlementType?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrderUpdateWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    transactionId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    totalQty?: NullableFloatFieldUpdateOperationsInput | number | null
    totalPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    itemsJson?: StringFieldUpdateOperationsInput | string
    quoteJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    selectedOffer?: CatalogOfferUpdateOneWithoutOrdersNestedInput
    blocks?: OfferBlockUpdateManyWithoutOrderNestedInput
  }

  export type OrderUncheckedUpdateWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    transactionId?: StringFieldUpdateOperationsInput | string
    selectedOfferId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    totalQty?: NullableFloatFieldUpdateOperationsInput | number | null
    totalPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    itemsJson?: StringFieldUpdateOperationsInput | string
    quoteJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    blocks?: OfferBlockUncheckedUpdateManyWithoutOrderNestedInput
  }

  export type OrderUncheckedUpdateManyWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    transactionId?: StringFieldUpdateOperationsInput | string
    selectedOfferId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    totalQty?: NullableFloatFieldUpdateOperationsInput | number | null
    totalPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    itemsJson?: StringFieldUpdateOperationsInput | string
    quoteJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OfferBlockUpdateWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reservedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    soldAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    offer?: CatalogOfferUpdateOneRequiredWithoutBlocksNestedInput
    item?: CatalogItemUpdateOneRequiredWithoutBlocksNestedInput
    order?: OrderUpdateOneWithoutBlocksNestedInput
  }

  export type OfferBlockUncheckedUpdateWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    offerId?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    orderId?: NullableStringFieldUpdateOperationsInput | string | null
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reservedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    soldAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OfferBlockUncheckedUpdateManyWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    offerId?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    orderId?: NullableStringFieldUpdateOperationsInput | string | null
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reservedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    soldAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type CatalogOfferCreateManyItemInput = {
    id: string
    providerId: string
    priceValue: number
    currency?: string
    maxQty: number
    timeWindowStart: Date | string
    timeWindowEnd: Date | string
    pricingModel?: string
    settlementType?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OfferBlockCreateManyItemInput = {
    id: string
    offerId: string
    providerId: string
    status?: string
    orderId?: string | null
    transactionId?: string | null
    priceValue: number
    currency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reservedAt?: Date | string | null
    soldAt?: Date | string | null
  }

  export type CatalogOfferUpdateWithoutItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    maxQty?: FloatFieldUpdateOperationsInput | number
    timeWindowStart?: DateTimeFieldUpdateOperationsInput | Date | string
    timeWindowEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    pricingModel?: StringFieldUpdateOperationsInput | string
    settlementType?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    provider?: ProviderUpdateOneRequiredWithoutOffersNestedInput
    blocks?: OfferBlockUpdateManyWithoutOfferNestedInput
    orders?: OrderUpdateManyWithoutSelectedOfferNestedInput
  }

  export type CatalogOfferUncheckedUpdateWithoutItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    maxQty?: FloatFieldUpdateOperationsInput | number
    timeWindowStart?: DateTimeFieldUpdateOperationsInput | Date | string
    timeWindowEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    pricingModel?: StringFieldUpdateOperationsInput | string
    settlementType?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    blocks?: OfferBlockUncheckedUpdateManyWithoutOfferNestedInput
    orders?: OrderUncheckedUpdateManyWithoutSelectedOfferNestedInput
  }

  export type CatalogOfferUncheckedUpdateManyWithoutItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    maxQty?: FloatFieldUpdateOperationsInput | number
    timeWindowStart?: DateTimeFieldUpdateOperationsInput | Date | string
    timeWindowEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    pricingModel?: StringFieldUpdateOperationsInput | string
    settlementType?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OfferBlockUpdateWithoutItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reservedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    soldAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    offer?: CatalogOfferUpdateOneRequiredWithoutBlocksNestedInput
    provider?: ProviderUpdateOneRequiredWithoutBlocksNestedInput
    order?: OrderUpdateOneWithoutBlocksNestedInput
  }

  export type OfferBlockUncheckedUpdateWithoutItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    offerId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    orderId?: NullableStringFieldUpdateOperationsInput | string | null
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reservedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    soldAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OfferBlockUncheckedUpdateManyWithoutItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    offerId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    orderId?: NullableStringFieldUpdateOperationsInput | string | null
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reservedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    soldAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OfferBlockCreateManyOfferInput = {
    id: string
    itemId: string
    providerId: string
    status?: string
    orderId?: string | null
    transactionId?: string | null
    priceValue: number
    currency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reservedAt?: Date | string | null
    soldAt?: Date | string | null
  }

  export type OrderCreateManySelectedOfferInput = {
    id: string
    transactionId: string
    providerId?: string | null
    status?: string
    totalQty?: number | null
    totalPrice?: number | null
    currency?: string | null
    itemsJson: string
    quoteJson: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OfferBlockUpdateWithoutOfferInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reservedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    soldAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    item?: CatalogItemUpdateOneRequiredWithoutBlocksNestedInput
    provider?: ProviderUpdateOneRequiredWithoutBlocksNestedInput
    order?: OrderUpdateOneWithoutBlocksNestedInput
  }

  export type OfferBlockUncheckedUpdateWithoutOfferInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    orderId?: NullableStringFieldUpdateOperationsInput | string | null
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reservedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    soldAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OfferBlockUncheckedUpdateManyWithoutOfferInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    orderId?: NullableStringFieldUpdateOperationsInput | string | null
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reservedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    soldAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OrderUpdateWithoutSelectedOfferInput = {
    id?: StringFieldUpdateOperationsInput | string
    transactionId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    totalQty?: NullableFloatFieldUpdateOperationsInput | number | null
    totalPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    itemsJson?: StringFieldUpdateOperationsInput | string
    quoteJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    provider?: ProviderUpdateOneWithoutOrdersNestedInput
    blocks?: OfferBlockUpdateManyWithoutOrderNestedInput
  }

  export type OrderUncheckedUpdateWithoutSelectedOfferInput = {
    id?: StringFieldUpdateOperationsInput | string
    transactionId?: StringFieldUpdateOperationsInput | string
    providerId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    totalQty?: NullableFloatFieldUpdateOperationsInput | number | null
    totalPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    itemsJson?: StringFieldUpdateOperationsInput | string
    quoteJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    blocks?: OfferBlockUncheckedUpdateManyWithoutOrderNestedInput
  }

  export type OrderUncheckedUpdateManyWithoutSelectedOfferInput = {
    id?: StringFieldUpdateOperationsInput | string
    transactionId?: StringFieldUpdateOperationsInput | string
    providerId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    totalQty?: NullableFloatFieldUpdateOperationsInput | number | null
    totalPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    itemsJson?: StringFieldUpdateOperationsInput | string
    quoteJson?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OfferBlockCreateManyOrderInput = {
    id: string
    offerId: string
    itemId: string
    providerId: string
    status?: string
    transactionId?: string | null
    priceValue: number
    currency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reservedAt?: Date | string | null
    soldAt?: Date | string | null
  }

  export type OfferBlockUpdateWithoutOrderInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reservedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    soldAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    offer?: CatalogOfferUpdateOneRequiredWithoutBlocksNestedInput
    item?: CatalogItemUpdateOneRequiredWithoutBlocksNestedInput
    provider?: ProviderUpdateOneRequiredWithoutBlocksNestedInput
  }

  export type OfferBlockUncheckedUpdateWithoutOrderInput = {
    id?: StringFieldUpdateOperationsInput | string
    offerId?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reservedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    soldAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OfferBlockUncheckedUpdateManyWithoutOrderInput = {
    id?: StringFieldUpdateOperationsInput | string
    offerId?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    priceValue?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reservedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    soldAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use ProviderCountOutputTypeDefaultArgs instead
     */
    export type ProviderCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ProviderCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use CatalogItemCountOutputTypeDefaultArgs instead
     */
    export type CatalogItemCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = CatalogItemCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use CatalogOfferCountOutputTypeDefaultArgs instead
     */
    export type CatalogOfferCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = CatalogOfferCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use OrderCountOutputTypeDefaultArgs instead
     */
    export type OrderCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = OrderCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ProviderDefaultArgs instead
     */
    export type ProviderArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ProviderDefaultArgs<ExtArgs>
    /**
     * @deprecated Use CatalogItemDefaultArgs instead
     */
    export type CatalogItemArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = CatalogItemDefaultArgs<ExtArgs>
    /**
     * @deprecated Use CatalogOfferDefaultArgs instead
     */
    export type CatalogOfferArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = CatalogOfferDefaultArgs<ExtArgs>
    /**
     * @deprecated Use OfferBlockDefaultArgs instead
     */
    export type OfferBlockArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = OfferBlockDefaultArgs<ExtArgs>
    /**
     * @deprecated Use OrderDefaultArgs instead
     */
    export type OrderArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = OrderDefaultArgs<ExtArgs>
    /**
     * @deprecated Use EventDefaultArgs instead
     */
    export type EventArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = EventDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}