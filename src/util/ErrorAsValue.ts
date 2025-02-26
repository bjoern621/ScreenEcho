export default function errorAsValue<T>(
    promise: Promise<T>
): Promise<[Error, undefined] | [undefined, T]> {
    return promise
        .then(result => {
            return [undefined, result] as [undefined, T];
        })
        .catch(err => {
            return [err, undefined];
        });
}
