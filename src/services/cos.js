'use strict';

const COS = require('cos-nodejs-sdk-v5');
const { Readable } = require('stream');

const cos = new COS({
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY,
});

const Bucket = process.env.COS_BUCKET;
const Region = process.env.COS_REGION || 'ap-hongkong';

/**
 * 上传 zip 文件到 COS
 * @param {string} key - 对象 key，如 skills/uuid.zip
 * @param {Buffer} buffer
 */
async function uploadZip(key, buffer) {
  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket,
      Region,
      Key: key,
      Body: buffer,
      ContentType: 'application/zip',
    }, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

/**
 * 获取 COS 对象的下载 URL（临时签名，1小时有效）
 */
async function getDownloadUrl(key) {
  return new Promise((resolve, reject) => {
    cos.getObjectUrl({
      Bucket,
      Region,
      Key: key,
      Sign: true,
      Expires: 3600,
    }, (err, data) => {
      if (err) return reject(err);
      resolve(data.Url);
    });
  });
}

/**
 * 删除 COS 对象
 */
async function deleteObject(key) {
  return new Promise((resolve, reject) => {
    cos.deleteObject({ Bucket, Region, Key: key }, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

module.exports = { uploadZip, getDownloadUrl, deleteObject };
