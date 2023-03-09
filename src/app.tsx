import { useCallback, useState, useEffect } from "react";
import produce, { Draft } from "immer";
import { uniqBy, isNil } from "ramda";
import { ConfigProvider, Avatar, Button, Dropdown, Menu, Table, message, Modal } from "antd";
import dayjs from "dayjs";
import { UploadOutlined, LogoutOutlined, DeleteOutlined, Loading3QuartersOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import request from "@/request";
import Login, { UserData } from "@/components/login";
import UploadMusic from "@/components/upload";
import zhCN from "antd/es/locale/zh_CN";
import { setLocalStorage, removeLocalStorage, getLocalStorage, aesDecrypt, aesEncrypt } from "@/utils";
import styles from "./app.scss";

interface CloudMusic {
    songId: number | string;
    songName: string;
    artist: string;
    album: string;
    addTime: number;
    fileSize: number;
}

interface Pagination {
    currentPage: number;
    pageSize: number;
}

interface MusicDataState {
    loading: boolean;
    dataSource: CloudMusic[];
    total: number;
}

const ROW_KEY = "songId";
const USER_COOKIE = "netease_cloud_uploader_user_cookie";
const initUserData = {
    userId: undefined,
    nickname: undefined,
    avatarUrl: undefined,
    cookie: undefined,
};
const initMusicData = {
    loading: false,
    dataSource: [],
    total: 0,
};
const initPagination = {
    currentPage: 1,
    pageSize: 20,
};

const App = () => {
    const [loginOpen, setLoginOpen] = useState<boolean>(false);
    const [uploadOpen, setUploadOpen] = useState<boolean>(false);
    const [userData, setUserData] = useState<UserData>(initUserData);
    const [musicData, setMusicData] = useState<MusicDataState>(initMusicData);
    const [selectedRows, setSelectedRows] = useState<CloudMusic[]>([]);
    const [pagination, setPagination] = useState<Pagination>(initPagination);
    const { nickname, avatarUrl, cookie, userId } = userData;
    const { dataSource, total, loading: musicLoading } = musicData;
    const logined = cookie !== undefined && userId !== undefined;

    const getCloudMusicList = useCallback(async () => {
        try {
            const { pageSize, currentPage } = pagination;
            setMusicData(
                produce((draft: Draft<MusicDataState>) => {
                    draft.loading = true;
                }),
            );
            const response = await request("/user/cloud", {
                data: {
                    cookie,
                    limit: pageSize,
                    offset: (currentPage - 1) * pageSize,
                },
            });
            const responseList = Array.isArray(response?.data) ? response.data : [];
            setMusicData(
                produce((draft: Draft<MusicDataState>) => {
                    draft.loading = false;
                    draft.total = response?.count ?? 0;
                    draft.dataSource = responseList.map(({ songId, songName, artist, album, addTime, fileSize }) => ({
                        songId,
                        artist,
                        album,
                        addTime,
                        fileSize,
                        songName,
                    }));
                }),
            );
        } catch {
            setMusicData(
                produce((draft: Draft<MusicDataState>) => {
                    draft.loading = false;
                }),
            );
        }
    }, [cookie, pagination]);

    const getLoginedStatus = useCallback(async () => {
        try {
            const storageCookie = aesDecrypt(getLocalStorage(USER_COOKIE));
            if (isNil(storageCookie)) {
                return;
            }
            const userResponse = await request(`/login/status?timerstamp=${dayjs().valueOf()}`, {
                getResponse: true,
                data: {
                    cookie: storageCookie,
                },
            });
            const newUserData = {
                cookie: storageCookie,
                userId: userResponse?.data?.profile?.userId,
                nickname: userResponse?.data?.profile?.nickname,
                avatarUrl: userResponse?.data?.profile?.avatarUrl,
            };
            // 如果登录过期
            if (isNil(newUserData.userId) || isNil(newUserData.cookie)) {
                throw new Error("登录已过期，请重新登录");
            }
            setUserData(newUserData);
        } catch (error) {
            message.error(error?.message || "登录已过期，请重新登录");
            removeLocalStorage(USER_COOKIE);
        }
    }, []);

    const onCloseLogin = useCallback(() => {
        setLoginOpen(false);
    }, []);

    const onCloseUpload = useCallback(() => {
        setUploadOpen(false);
    }, []);

    const afterUploadOk = useCallback(() => {
        setPagination((prevPagination: Pagination) => ({ ...prevPagination, currentPage: 1 }));
    }, []);

    const afterLoginSuccess = useCallback((data: UserData) => {
        setLocalStorage(USER_COOKIE, aesEncrypt(data.cookie));
        setUserData(data);
    }, []);

    const onDeleteCloudMusic = async (id?: string | number) => {
        try {
            await request("/user/cloud/del", { data: { id, cookie } });
            message.success("删除成功");
            setSelectedRows([]);
            getCloudMusicList();
        } catch {
            message.error("删除失败");
        }
    };

    const onChangePageParams = ({ pageSize, current: currentPage }) => {
        setPagination({ pageSize, currentPage });
    };

    const onBatchDeleteCloudMusic = () => {
        const { length } = selectedRows;
        if (length === 0) {
            message.error("请先选择需要删除的音乐！");
            return;
        }
        Modal.confirm({
            title: "批量删除",
            content: `确定要删除这${length}首音乐吗？`,
            okText: "确定",
            cancelText: "取消",
            onOk: () => onDeleteCloudMusic(selectedRows.map((item: CloudMusic) => item[ROW_KEY]).join(",")),
        });
    };

    const onSelectChange = (record: CloudMusic, selected: boolean) => {
        if (selected) {
            setSelectedRows((prevRows: CloudMusic[]) =>
                uniqBy((item) => item?.[ROW_KEY], [...(prevRows || []), record]),
            );
            return;
        }
        setSelectedRows(
            produce((draft) => {
                const index = draft.findIndex((item) => item[ROW_KEY] === record[ROW_KEY]);
                draft.splice(index, 1);
            }),
        );
    };

    const onSelectAllChange = (selected: boolean) => {
        if (selected) {
            setSelectedRows((prevRows: CloudMusic[]) =>
                uniqBy((item) => item?.[ROW_KEY], [...(prevRows || []), ...dataSource]),
            );
            return;
        }
        setSelectedRows([]);
    };

    const userLogout = async () => {
        await request("/logout", { data: { cookie } });
        removeLocalStorage(USER_COOKIE);
        setUserData(initUserData);
        setPagination(initPagination);
        setMusicData(initMusicData);
        setSelectedRows([]);
    };

    const menu = (
        <Menu
            items={[
                {
                    key: "logout",
                    label: "退出登录",
                    icon: <LogoutOutlined />,
                    onClick: userLogout,
                },
            ]}
        />
    );

    useEffect(() => {
        getLoginedStatus();
    }, [getLoginedStatus]);

    useEffect(() => {
        if (logined) {
            getCloudMusicList();
        }
    }, [getCloudMusicList, logined]);

    const columns: ColumnsType<CloudMusic> = [
        {
            title: "音乐标题",
            dataIndex: "songName",
        },
        {
            title: "歌手",
            dataIndex: "artist",
        },
        {
            title: "专辑",
            dataIndex: "album",
        },
        {
            title: "大小",
            dataIndex: "fileSize",
            render: (size) => `${(size / 1_048_576).toFixed(1)}MB`,
        },
        {
            title: "上传时间",
            dataIndex: "addTime",
            render: (date) => dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
        },
        {
            title: "操作",
            dataIndex: "operate",
            fixed: "right",
            render: (_, record: CloudMusic) => (
                <span
                    className={styles.operate}
                    onClick={() => {
                        onDeleteCloudMusic(record[ROW_KEY]);
                    }}
                >
                    删除
                </span>
            ),
        },
    ];

    return (
        <ConfigProvider locale={zhCN}>
            <div className={styles.appArea}>
                <div className={styles.header}>
                    <div className={styles.userInfo}>
                        {logined ? (
                            <Dropdown overlay={menu} placement="bottom" arrow={{ pointAtCenter: true }}>
                                <div style={{ cursor: "pointer" }}>
                                    <Avatar src={avatarUrl} />
                                    <span className={styles.nickname}>{nickname}</span>
                                </div>
                            </Dropdown>
                        ) : (
                            <Button
                                type="link"
                                className={styles.loginBtn}
                                onClick={() => {
                                    setLoginOpen(true);
                                }}
                            >
                                点击登录
                            </Button>
                        )}
                    </div>
                    {logined ? (
                        <div className={styles.operateGroup}>
                            <Button type="primary" icon={<DeleteOutlined />} onClick={onBatchDeleteCloudMusic}>
                                批量删除
                            </Button>
                            <Button
                                type="default"
                                loading={musicLoading}
                                icon={<Loading3QuartersOutlined />}
                                onClick={getCloudMusicList}
                            >
                                刷新
                            </Button>
                            <Button
                                type="default"
                                icon={<UploadOutlined />}
                                onClick={() => {
                                    setUploadOpen(true);
                                }}
                            >
                                上传
                            </Button>
                        </div>
                    ) : null}
                </div>
                <Table
                    size="middle"
                    rowKey={ROW_KEY}
                    columns={columns}
                    dataSource={dataSource}
                    loading={musicLoading}
                    onChange={onChangePageParams}
                    pagination={{
                        total,
                        pageSize: pagination.pageSize,
                        current: pagination.currentPage,
                        hideOnSinglePage: true,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: () => `共${total}首`,
                    }}
                    rowSelection={{
                        selectedRowKeys: selectedRows.map((item: CloudMusic) => item[ROW_KEY]),
                        onSelect: onSelectChange,
                        onSelectAll: onSelectAllChange,
                    }}
                />
            </div>
            <Login open={loginOpen} onCancel={onCloseLogin} afterLoginSuccess={afterLoginSuccess} />
            <UploadMusic cookie={cookie} open={uploadOpen} onClose={onCloseUpload} afterOk={afterUploadOk} />
        </ConfigProvider>
    );
};

export default App;
