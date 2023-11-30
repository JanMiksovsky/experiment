import type { AsyncTree } from "@graphorigami/types";

export * from "./main.js";

export type KeyFn = (key: any, innerTree: AsyncTree) => any;

/**
 * An object with a non-trivial `toString` method.
 *
 * TODO: We want to deliberately exclude the base `Object` class because its
 * `toString` method return non-useful strings like `[object Object]`. How can
 * we declare that in TypeScript?
 */
export type HasString = {
  toString(): string;
};

export type PlainObject = {
  [key: string]: any;
};

export type ReduceFn = (values: any[], keys: any[]) => Promise<any>;

export type StringLike = string | HasString;

type NativeTreelike = 
  any[] |
  AsyncTree |
  Function | 
  Map<any, any> | 
  PlainObject | 
  Set<any>;

export type Treelike =
  NativeTreelike |
  Unpackable<NativeTreelike>;

export type TreeTransform = (tree: AsyncTree) => AsyncTree;

export type Unpackable<T> = {
  unpack(): Promise<T>
};

export type ValueKeyFn = (value: any, key: any, innerTree: AsyncTree) => any;
