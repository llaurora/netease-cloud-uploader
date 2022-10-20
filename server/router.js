const express = require("express");
const fs = require("fs");
const CloudApi = require("NeteaseCloudMusicApi");
const multipart = require("connect-multiparty");

const multipartMiddleware = multipart();

const router = express.Router();

router.post("/login/cellphone", async (req, res) => {
    try {
        const data = await CloudApi.login_cellphone(req.body);
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});

router.post("/user/cloud", async (req, res) => {
    try {
        const data = await CloudApi.user_cloud(req.body);
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});

router.post("/user/cloud/del", async (req, res) => {
    try {
        const data = await CloudApi.user_cloud_del(req.body);
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});

router.post("/logout", async (req, res) => {
    try {
        const data = await CloudApi.logout(req.body);
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});

router.get("/login/qr/key", async (_, res) => {
    try {
        const data = await CloudApi.login_qr_key();
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});

router.get("/login/qr/create", async (req, res) => {
    try {
        const data = await CloudApi.login_qr_create(req.query);
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});

router.get("/login/qr/check", async (req, res) => {
    try {
        const data = await CloudApi.login_qr_check(req.query);
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});

router.post("/login/status", async (req, res) => {
    try {
        const data = await CloudApi.login_status(req.body);
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});

router.post("/cloud", multipartMiddleware, async (req, res) => {
    const {
        files: { file: musicFile },
        query: { cookie },
    } = req;
    try {
        const data = await CloudApi.cloud({
            cookie,
            songFile: {
                name: musicFile.name,
                data: fs.readFileSync(musicFile.path),
            },
        });
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});

module.exports = router;
