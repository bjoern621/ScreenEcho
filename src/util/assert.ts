class AssertionError extends Error {
    constructor(msg?: string) {
        super("[ASSERT] " + (msg || ""));
    }
}

export function assert(expr: unknown, msg?: string): asserts expr {
    if (!expr) throw new AssertionError(msg);
}

export function isUndefined(
    obj: unknown,
    msg?: string
): asserts obj is undefined {
    if (obj !== undefined) throw new AssertionError(msg);
}

export function never(msg?: string, _exp: boolean = false): asserts _exp {
    throw new AssertionError(msg);
}
