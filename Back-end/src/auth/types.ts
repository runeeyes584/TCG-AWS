import type { JWTPayload } from "jose";

export interface CognitoPayload extends JWTPayload {
    sub: string;
    username?: string;
    email?: string;
    token_use?: "access" | "id";
    client_id?: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface VerifyRequest {
  email: string;
  code: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyRequest {
  email: string;
  code: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RefreshRequest {

    refreshToken: string;

}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    email: string;
    code: string;
    password: string;
}