export declare const env: {
    nodeEnv: string;
    port: number;
    database: {
        provider: "sqlite" | "mysql" | "postgresql";
        url: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
};
