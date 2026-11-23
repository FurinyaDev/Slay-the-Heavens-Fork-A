# 铁甲战士三幕普通结局回放

种子 `2`、`full-source` 开发配置、987 条公开命令。回放每次从新 Run 和第一幕地图开始，逐层验证当前房间与流程，再调用相应的公开命令。操作表记录合法选择，重放时无需读取策略、探查未来随机数或恢复战斗检查点。

预期抵达第 51 层并以 16 点生命进入 `normal_victory`。第 17、34 层各领取一次首领宝箱，第 43 层实际完成瓶装遗物选择。第 50 层通过正常出牌击败两阶段的觉醒者，第 51 层进入结束节点。新局产生相同初始状态，第四幕、账号历史、正式发布和设备验收不在这份离线证据范围内。

```sh
npm run build:data
node scripts/m3-normal-campaign.mjs \
  --replay docs/evidence/act3-normal-campaign-20261123/ironclad-seed-2.json.gz \
  --output build/act3-normal-campaign
```

命令不匹配或终局状态偏离文件中的预期值时，进程返回失败。输出 `summary.json` 和压缩轨迹包含提交、命令表与驱动的 SHA-256、两次跨幕的资源与随机流快照、最终状态及本局路线。
