import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Form, Input, Button } from "antd";
import type { ModalProps } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import request from "@/request";
import logo from "@/assets/logo.png";
import dayjs from "dayjs";
import styles from "./index.scss";

const { Item } = Form;
const { Password } = Input;

enum LoginMethodEnum {
    "CELLPHONE" = 0,
    "QRCODE" = 1,
}

export interface UserData {
    nickname: string;
    avatarUrl: string;
    cookie: string;
    userId: string | number;
}

export interface LoginProps extends ModalProps {
    onCancel: () => void;
    afterLoginSuccess: (params: UserData) => void;
}

const EXPIRE_CODE = 800;
const QRCODE_SUCCESS = 803;

const Login = ({ open, onCancel, afterLoginSuccess }: LoginProps) => {
    const [form] = Form.useForm();
    const { validateFields, resetFields } = form;
    const [loading, setLoading] = useState<boolean>(false);
    const [loginMethod, setLoginMethod] = useState<LoginMethodEnum>(LoginMethodEnum.QRCODE);
    const [qrImg, setQrImg] = useState<string>();
    const [expire, setExpire] = useState<boolean>(false);
    const qrCodeExpireTimerRef = useRef(null);

    const loginByQrCode = useCallback(async () => {
        try {
            const qrKeyResponse = await request(`/login/qr/key?timerstamp=${dayjs().valueOf()}`, { method: "get" });
            const qrKey = qrKeyResponse?.data?.unikey;
            const qrImgResponse = await request(
                `/login/qr/create?key=${qrKey}&qrimg=true&timerstamp=${dayjs().valueOf()}`,
                {
                    method: "get",
                },
            );
            setQrImg(qrImgResponse?.data?.qrimg);
            qrCodeExpireTimerRef.current = setInterval(async () => {
                const statusResponse = await request(
                    `/login/qr/check?key=${qrKey}&qrimg=true&timerstamp=${dayjs().valueOf()}`,
                    { method: "get", getResponse: true },
                );
                if (statusResponse.code === EXPIRE_CODE) {
                    setExpire(true);
                    clearInterval(qrCodeExpireTimerRef.current);
                    return;
                }
                if (statusResponse.code === QRCODE_SUCCESS) {
                    clearInterval(qrCodeExpireTimerRef.current);
                    const { cookie } = statusResponse;
                    const userResponse = await request(`/login/status?timerstamp=${dayjs().valueOf()}`, {
                        getResponse: true,
                        data: {
                            cookie,
                        },
                    });
                    onCancel();
                    afterLoginSuccess({
                        cookie,
                        userId: userResponse?.data?.profile?.userId,
                        nickname: userResponse?.data?.profile?.nickname,
                        avatarUrl: userResponse?.data?.profile?.avatarUrl,
                    });
                }
            }, 3000);
        } catch (error) {
            console.log(error);
        }
    }, [afterLoginSuccess, onCancel]);

    const afterClose = () => {
        resetFields();
        setLoginMethod(LoginMethodEnum.QRCODE);
        setQrImg(undefined);
        setExpire(false);
        if (qrCodeExpireTimerRef.current) {
            clearInterval(qrCodeExpireTimerRef.current);
            qrCodeExpireTimerRef.current = null;
        }
    };

    const onSubmit = () => {
        validateFields().then(async (values) => {
            try {
                setLoading(true);
                const response = await request("/login/cellphone", {
                    data: values,
                });
                setLoading(false);
                onCancel();
                afterLoginSuccess({
                    userId: response?.profile?.userId,
                    nickname: response?.profile?.nickname,
                    avatarUrl: response?.profile?.avatarUrl,
                    cookie: response?.cookie,
                });
            } catch {
                setLoading(false);
            }
        });
    };

    const onRefreshQrCode = () => {
        setQrImg(undefined);
        setExpire(false);
        loginByQrCode();
    };

    useEffect(() => {
        if (loginMethod === LoginMethodEnum.QRCODE && open) {
            loginByQrCode();
        }
    }, [loginByQrCode, loginMethod, open]);

    const renderLoginMethod = () => {
        switch (loginMethod) {
            case LoginMethodEnum.CELLPHONE:
                return (
                    <>
                        <Item className={styles.logoArea}>
                            <img src={logo} alt="logo" />
                        </Item>
                        <Form form={form}>
                            <Item
                                name="phone"
                                rules={[
                                    {
                                        required: true,
                                        message: "请输入手机号码",
                                    },
                                ]}
                            >
                                <Input placeholder="请输入手机号码" />
                            </Item>
                            <Item
                                name="password"
                                rules={[
                                    {
                                        required: true,
                                        message: "请输入密码",
                                    },
                                ]}
                            >
                                <Password placeholder="请输入手机号码" />
                            </Item>
                        </Form>
                        <Item className={styles.loginBtn}>
                            <Button block type="primary" onClick={onSubmit} loading={loading}>
                                登录
                            </Button>
                        </Item>
                        <span
                            className={styles.method}
                            onClick={() => {
                                clearInterval(qrCodeExpireTimerRef.current);
                                setLoginMethod(LoginMethodEnum.QRCODE);
                            }}
                        >
                            扫码登录
                        </span>
                    </>
                );
            case LoginMethodEnum.QRCODE:
                return (
                    <div className={styles.loginQrCodeMethod}>
                        <span className={styles.title}>扫码登录</span>
                        {qrImg ? (
                            <div className={styles.qrImgContainer}>
                                <img src={qrImg} alt="qrcode" />
                                {expire ? (
                                    <div className={styles.mask}>
                                        <span className={styles.expireTips}>二维码已失效</span>
                                        <Button type="primary" onClick={onRefreshQrCode}>
                                            点击刷新
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <div style={{ marginTop: 12 }}>
                                <LoadingOutlined style={{ marginRight: 8 }} />
                                <span>二维码生成中，请稍等~</span>
                            </div>
                        )}
                        <span
                            className={styles.method}
                            onClick={() => {
                                if (qrCodeExpireTimerRef.current) {
                                    clearInterval(qrCodeExpireTimerRef.current);
                                }
                                setLoginMethod(LoginMethodEnum.CELLPHONE);
                            }}
                        >
                            手机密码登录
                        </span>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Modal
            title={null}
            footer={null}
            open={open}
            width={360}
            confirmLoading={loading}
            onCancel={onCancel}
            afterClose={afterClose}
            className={styles.loginModal}
        >
            {renderLoginMethod()}
        </Modal>
    );
};

export default Login;
