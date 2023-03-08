import AES from "crypto-js/aes";
import ENCUtf8 from "crypto-js/enc-utf8";

export const AES_KEY = "5VxLaT2qYs7w1ieb";

/**
 * AES加密
 * @param data
 */
export const aesEncrypt = (data) => {
    let transSource;
    const isObjectTypeData = typeof data === "object";
    if (isObjectTypeData) {
        try {
            transSource = JSON.stringify(data);
        } catch (error) {
            console.log("encrypt error:", error);
        }
    }
    return AES.encrypt(isObjectTypeData ? transSource : data, AES_KEY).toString();
};

/**
 * AES解密
 * @param data
 */
export const aesDecrypt = (data) => {
    let bytesStringData;
    let decryptedData;
    let isObjectTypeData;
    try {
        const bytes = AES.decrypt(data, AES_KEY);
        bytesStringData = bytes.toString(ENCUtf8);
        decryptedData = JSON.parse(bytesStringData);
        isObjectTypeData = typeof decryptedData === "object";
    } catch {
        decryptedData = bytesStringData;
    }
    return isObjectTypeData ? decryptedData : bytesStringData;
};

/**
 * localStorage设置
 * @param key
 * @param value
 */
export function setLocalStorage(key: string, value: any): void {
    let transSource: string;
    try {
        transSource = JSON.stringify(value);
    } catch {
        transSource = value;
    }
    localStorage.setItem(key, transSource);
}

/**
 * localStorage获取
 * @param key
 */
export function getLocalStorage(key: string): any {
    const getVal = localStorage.getItem(key);
    return (() => {
        let transTarget: string;
        try {
            transTarget = JSON.parse(getVal);
        } catch {
            transTarget = getVal;
        }
        return transTarget;
    })();
}

/**
 * localStorage移除
 * @param key
 */
export function removeLocalStorage(key: string): any {
    localStorage.removeItem(key);
}
