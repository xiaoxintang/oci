import { createHmac } from "node:crypto";
function getHookUrl() {
  /**钉钉文档链接
   * https://open.dingtalk.com/document/robots/customize-robot-security-settings
   */
  const secret = process.env.DINGTALK_SECRET;
  const timestamp = Date.now();
  const str = `${timestamp}\n${secret}`;
  const hmac = createHmac("sha256", secret as string);
  hmac.update(str);
  const sign = hmac.digest("base64");

  return `https://oapi.dingtalk.com/robot/send?access_token=${process.env.DINGTALK_ACCESS_TOKEN}&timestamp=${timestamp}&sign=${sign}`;
}

export async function sendDingTalkTextMessage(msg: {
  content: string;
  atMobiles?: string[];
}) {
  /**https://open.dingtalk.com/document/dingstart/custom-bot-send-message-type?spm=ding_open_doc.document.0.0.429c3665CjESFK */
  const hookUrl = getHookUrl();

  const response = await fetch(hookUrl, {
    method: "POST",
    body: JSON.stringify({
      msgtype: "text",
      text: {
        content: msg.content,
      },
      at: {
        atMobiles: msg.atMobiles || [],
      },
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const responseText = await response.text();

  return {
    ok: response.ok,
    responseText,
  };
}
