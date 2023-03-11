export interface BodyResponse {
    registered: boolean,
}

export interface Item {
    email: string,
    tries: number,
    expiration: number,
}

export interface Payload {
    email: string
    iat: number,
    exp: number
}