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