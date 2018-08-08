process.env.PATH = `${process.env.PATH}:${process.env.LAMBDA_TASK_ROOT}`;

const wkhtmltopdf = require("./utils/wkhtmltopdf");
const errorUtil = require("./utils/error");
const MemoryStream = require('memorystream');

const AWS = require('aws-sdk');

exports.handler = function handler(event, context, callback) {
    if (!event.html_base64) {
        const errorResponse = errorUtil.createErrorResponse(400, "Validation error: Missing field 'html_base64'.");
        callback(errorResponse);
        return;
    }
    if (!event.bucket) {
        const errorResponse = errorUtil.createErrorResponse(400, "Validation error: Missing field 'bucket'.");
        callback(errorResponse);
        return;
    }
    if (!event.filename) {
        const errorResponse = errorUtil.createErrorResponse(400, "Validation error: Missing field 'filename'.");
        callback(errorResponse);
        return;
    }

    const params = {
        Bucket: event.bucket,
        Key: event.filename,
        ACL: 'public-read'
    };

    const memStream = new MemoryStream();
    const html_utf8 = new Buffer(event.html_base64, 'base64').toString('utf8');

    wkhtmltopdf(html_utf8, ['--print-media-type']).then(buffer => {
        params.Body = buffer;
        params.Key += ".pdf";
        const s3 = new AWS.S3();
        s3.putObject(params, (err2, data) => {
            if (err2) {
                callback(errorUtil.createErrorResponse(500, "Internal server error", err2));
            }
            callback(null, {
                result: data,
                data: Buffer.from(buffer).toString('base64')
            });
        });
    }).catch(error => {
        callback(errorUtil.createErrorResponse(500, "Internal server error", error));
    });
};