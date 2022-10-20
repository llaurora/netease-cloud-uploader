import { useCallback, useState, useEffect } from "react";
import produce, { Draft } from "immer";
import { uniqBy } from "ramda";
import { ConfigProvider, Avatar, Button, Dropdown, Menu, Table, message, Modal } from "antd";
import dayjs from "dayjs";
import { UploadOutlined, LogoutOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import request from "@/request";
import Login, { UserData } from "@/components/login";
import UploadMusic from "@/components/upload";
import zhCN from "antd/es/locale/zh_CN";
import styles from "./app.scss";

interface CloudMusic {
    songId: number;
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

const rowKey = "songId";
const initUserData = {
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
    const { nickname, avatarUrl, cookie } = userData;
    const { dataSource, total, loading: musicLoading } = musicData;
    const logined = cookie !== undefined;

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
            onOk: () => onDeleteCloudMusic(selectedRows.map((item: CloudMusic) => item[rowKey]).join(",")),
        });
    };

    const onSelectChange = (record: CloudMusic, selected: boolean) => {
        if (selected) {
            setSelectedRows((prevRows: CloudMusic[]) =>
                uniqBy((item) => item?.[rowKey], [...(prevRows || []), record]),
            );
            return;
        }
        setSelectedRows(
            produce((draft) => {
                const index = draft.findIndex((item) => item[rowKey] === record[rowKey]);
                draft.splice(index, 1);
            }),
        );
    };

    const onSelectAllChange = (selected: boolean) => {
        if (selected) {
            setSelectedRows((prevRows: CloudMusic[]) =>
                uniqBy((item) => item?.[rowKey], [...(prevRows || []), ...dataSource]),
            );
            return;
        }
        setSelectedRows([]);
    };

    const userLogout = async () => {
        await request("/logout", { data: { cookie } });
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
                    className={styles.operteDel}
                    onClick={() => {
                        onDeleteCloudMusic(record[rowKey]);
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
                    rowKey={rowKey}
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
                        selectedRowKeys: selectedRows.map((item: CloudMusic) => item[rowKey]),
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
