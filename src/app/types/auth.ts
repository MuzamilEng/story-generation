export interface SignInFormData {
    email: string;
    password: string;
    remember: boolean;
}

export interface ResetFormData {
    email: string;
}

export interface SignInErrors {
    email: boolean;
    password: boolean;
}

export interface Testimonial {
    text: string;
    author: string;
}