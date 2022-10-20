import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance } from "axios";
import { notification } from "antd";

interface CustomRequestConfig<D = any> extends AxiosRequestConfig<D> {
    getResponse?: boolean;
}

interface CustomAxiosResponse<T = any, D = any> extends AxiosResponse<T> {
    config: CustomRequestConfig<D>;
}

interface AxiosResponseResult<T = any> {
    status: number;
    body: T;
}

export type RequestResponse<T = any> = Promise<CustomAxiosResponse<T>["data"]>;

type AxiosResponseData<T = any> = AxiosResponseResult<T>["body"];

const SUCCESS_CODE = 200;

const axiosRequest: AxiosInstance = axios.create({
    timeout: 30_000,
    headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
    },
});

axiosRequest.interceptors.request.use((config: CustomRequestConfig) => {
    if (!navigator.onLine) {
        throw new Error("Please check network configuration");
    }
    return config;
});

axiosRequest.interceptors.response.use((response: CustomAxiosResponse<AxiosResponseResult>) => {
    const {
        config: { getResponse },
        data: { status, body },
    } = response;
    if (status === SUCCESS_CODE && getResponse) {
        return body;
    }
    if (status === SUCCESS_CODE && body?.code === SUCCESS_CODE) {
        return body;
    }
    throw new Error(body?.message || "服务器发生错误");
});

const request = async <T = any>(url: string, options?: CustomRequestConfig): RequestResponse<AxiosResponseData<T>> => {
    try {
        const { method = "post", data, ...restOptions } = options || {};
        return await axiosRequest.request<T, RequestResponse<AxiosResponseData<T>>>({
            url,
            method,
            ...restOptions,
            ...(method === "get" ? { params: data } : { data }),
        });
    } catch (error) {
        notification.error({
            message: "Request Failure",
            description: error.message || "Oh! The system is out of business, we will restore it as soon as possible",
        });
        throw new Error(error);
    }
};

export default request;
