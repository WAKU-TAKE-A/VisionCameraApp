export type RootStackParamList = {
    Home: undefined;
    Camera: undefined;
    Result: {
        isSuccess: boolean;
        resultData?: any;
        imageUri?: string;
        errorMessage?: string;
    };
};
