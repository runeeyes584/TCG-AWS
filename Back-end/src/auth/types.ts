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