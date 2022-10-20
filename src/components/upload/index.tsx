import { memo, useState, useRef } from "react";
import produce, { Draft } from "immer";
import { Drawer, Space, Button, message, Upload } from "antd";
import type { DrawerProps, UploadFile } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import request from "@/request";
import dayjs from "dayjs";
import styles from "./index.scss";

interface UploadMusicProps extends DrawerProps {
    cookie: string;
    onClose?: () => void;
    afterOk?: () => void;
}

const { Dragger } = Upload;
const acceptArr = [".mp3", ".flac", ".ape", ".wma", ".wav", ".ogg", ".aac"];

const UploadMusic = ({ open, cookie, onClose, afterOk }: UploadMusicProps) => {
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const { length: fileLength } = fileList;
    const uploadNumRef = useRef<number>(0);
    const uploadFailureFilesRef = useRef<UploadFile[]>([]);

    const uploadToCloud = async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        try {
            await request(`/cloud?time=${dayjs().valueOf()}&cookie=${cookie}`, {
                data: formData,
            });
        } catch {
            uploadFailureFilesRef.current.push(file);
        } finally {
            uploadNumRef.current += 1;
            if (uploadNumRef.current >= fileLength) {
                uploadNumRef.current = 0;
                const failureLength = uploadFailureFilesRef.current.length;
                const sucess = fileLength - failureLength;
                setLoading(false);
                if (fileLength === 1 && sucess === 1) {
                    message.success("音乐上传成功");
                } else {
                    message.info(
                        `${sucess}首音乐上传成功${failureLength > 0 ? `，${failureLength}首音乐上传失败` : ""}`,
                    );
                }
                if (sucess > 0) {
                    afterOk();
                }
                if (failureLength > 0) {
                    setFileList(uploadFailureFilesRef.current);
                    uploadFailureFilesRef.current = [];
                } else {
                    onClose();
                }
            }
        }
    };

    const onSubmit = () => {
        setLoading(true);
        fileList.forEach((item: UploadFile) => {
            uploadToCloud(item);
        });
    };

    const onRemoveFile = (file) => {
        const index = fileList.indexOf(file);
        if (index !== -1) {
            setFileList(
                produce((draft: Draft<UploadFile>[]) => {
                    draft.splice(index, 1);
                }),
            );
        }
    };

    const beforeUpload = (file) => {
        setFileList(
            produce((draft: Draft<UploadFile>[]) => {
                draft.push(file);
            }),
        );
        return false;
    };

    const afterOpenChange = (bool: boolean) => {
        if (!bool) {
            setFileList([]);
        }
    };

    return (
        <Drawer
            title="上传音乐"
            placement="right"
            width={520}
            onClose={onClose}
            open={open}
            className={styles.uploadDrawer}
            afterOpenChange={afterOpenChange}
            extra={
                <Space>
                    <Button onClick={onClose}>取消</Button>
                    <Button type="primary" onClick={onSubmit} loading={loading}>
                        保存
                    </Button>
                </Space>
            }
        >
            <Dragger
                multiple
                fileList={fileList}
                onRemove={onRemoveFile}
                beforeUpload={beforeUpload}
                accept={acceptArr.join(",")}
            >
                <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或将文件拖拽到这里上传</p>
                <p className="ant-upload-hint">仅支持{acceptArr.join("、").replace(/\./g, "")}等音频格式</p>
            </Dragger>
        </Drawer>
    );
};

export default memo(UploadMusic);
