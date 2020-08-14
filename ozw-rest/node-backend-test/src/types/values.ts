export interface ValueItem<T = boolean | number | string> {
    value_id: string;
    node_id: number;
    class_id: number;
    type: ValueType;
    genre: ValueGenre;
    instance: number;
    index: number;
    label: string;
    units: string;
    help: string;
    read_only: boolean;
    write_only: boolean;
    min: number;
    max: number;
    is_polled: boolean;
    values?: string[];
    value: T;
}


export type ValueType =
    | "bool"
    | "byte"
    | "decimal"
    | "int"
    | "list"
    | "schedule"
    | "short"
    | "string"
    | "button"
    | "raw"
    | "max"
    | "bitset";


export type ValueGenre = "basic" | "user" | "system" | "config" | "count";