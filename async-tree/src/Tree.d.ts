import type { AsyncMutableTree, AsyncTree } from "@weborigami/types";
import { PlainObject, ReduceFn, Treelike, ValueKeyFn } from "../index.ts";

export function assign(target: Treelike, source: Treelike): Promise<AsyncTree>;
export function clear(AsyncTree: AsyncMutableTree): Promise<void>;
export function deepValuesIterator(treelike: Treelike, options?: { expand: boolean }): AsyncIterableIterator<any>
export function entries(AsyncTree: AsyncTree): Promise<IterableIterator<any>>;
export function forEach(AsyncTree: AsyncTree, callbackfn: (value: any, key: any) => Promise<void>): Promise<void>;
export function from(obj: any): AsyncTree;
export function has(AsyncTree: AsyncTree, key: any): Promise<boolean>;
export function isAsyncMutableTree(obj: any): obj is AsyncMutableTree;
export function isAsyncTree(obj: any): obj is AsyncTree;
export function isKeyForSubtree(tree: AsyncTree, obj: any): Promise<boolean>;
export function isTraversable(obj: any): boolean;
export function isTreelike(obj: any): obj is Treelike;
export function map(tree: Treelike, valueFn: ValueKeyFn): AsyncTree;
export function mapReduce(tree: Treelike, mapFn: ValueKeyFn|null, reduceFn: ReduceFn): Promise<any>;
export function plain(tree: Treelike): Promise<PlainObject>;
export function remove(AsyncTree: AsyncMutableTree, key: any): Promise<boolean>;
export function toFunction(tree: Treelike): Function;
export function traverse(tree: Treelike, ...keys: any[]): Promise<any>;
export function traverseOrThrow(tree: Treelike, ...keys: any[]): Promise<any>;
export function traversePath(tree: Treelike, path: string): Promise<any>;
export function values(AsyncTree: AsyncTree): Promise<IterableIterator<any>>;
