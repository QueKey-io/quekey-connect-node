/**
 * Copyright (c) 2026 GeneralQuery Technologies Pvt. Ltd.
 * Licensed under the MIT License.
 */

declare module 'quekey-connect-node' {
    import { Request, Response, NextFunction, RequestHandler } from 'express';

    interface QueKeyOptions {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
        redirectUri: string;
        environment?: 'sandbox' | 'live';
        authServerUrl?: string;
        successRedirect?: string;
        failureRedirect?: string;
        onSuccess?: (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
    }

    class QueKeyClient {
        constructor(options: QueKeyOptions);
        login(): RequestHandler;
        callback(): RequestHandler;
        protect(): RequestHandler;
        static getUser(req: Request): any;
        static generateVerifier(): string;
        static generateChallenge(verifier: string): string;
    }

    export = QueKeyClient;
}
