import { HeadObjectCommandOutput } from "@aws-sdk/client-s3";

export interface BodyResponse {
    registered?: boolean,
    verified?: boolean,
    notified?: boolean,
}

export interface Item {
    email: string,
    tries: number,
    expiration: number,
}

export interface Payload {
    email: string,
    file: string,
    iat?: number,
    exp?: number,
}

export interface PresignedUrlObject extends HeadObjectCommandOutput {
    url: string
}