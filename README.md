# TraderAnalysis Frontend

鑲＄エ鍒嗘瀽鍓嶇锛屽熀浜?Vue 3锛屽鎺ュ悗绔?FastAPI 鏈嶅姟銆傛彁渚涘競鍦烘俯搴︺€佷氦鏄撲俊鍙凤紙绌鸿浆澶?澶氳浆绌?涓诲崌娴緳澶?涓昏穼娴秴鍗栵級銆佷釜鑲℃妧鏈垎鏋愩€佷俊鍙峰洖娴嬨€佹鐩堟鎹熴€佹爣鐨勭鐞嗙瓑鍔熻兘銆?
馃敆 [浣撻獙鍦板潃](http://47.106.175.84/)

## 蹇€熷惎鍔?
### 鍓嶆彁鏉′欢

- **Node.js** >= 18锛堟帹鑽?20+锛夛紝闄勫甫 npm
- **鍚庣鏈嶅姟**杩愯鍦?`http://localhost:8000`锛團astAPI锛屾帴鍙ｆ枃妗ｏ細http://localhost:8000/docs锛?
### 涓夋鍚姩

```bash
# 1. 瀹夎渚濊禆
npm install

# 2. 鍚姩寮€鍙戞湇鍔″櫒锛堥粯璁?http://localhost:5173锛?npm run dev

# 3. 鎵撳紑娴忚鍣ㄨ闂?#    棣栭〉: http://localhost:5173/
```

### 鐢熶骇鏋勫缓

```bash
npm run build    # 杈撳嚭鍒?dist/ 鐩綍
npm run preview  # 鏈湴棰勮鐢熶骇鏋勫缓
```

## 鍔熻兘椤甸潰

| 椤甸潰 | 璺敱 | 璇存槑 |
|------|------|------|
| 棣栭〉 | `/` | 浠峰€兼姇璧勭悊蹇靛睍绀?|
| 甯傚満娓╁害 | `/market-temperature` | 3 缁村害缁煎悎璇勫垎锛? 绾х姸鎬佹槧灏勶紝浠撲綅寤鸿锛孲PY/QQQ 鎸囨爣锛屽巻鍙茶秼鍔垮浘 |
| 浜ゆ槗淇″彿 | `/momentum-leaders` | 绌鸿浆澶?澶氳浆绌猴紙EMA5/30浜ゅ弶锛? 涓诲崌娴緳澶?+ 涓昏穼娴秴鍗?|
| 涓偂鎶€鏈垎鏋?| `/dashboard` | 6 缁村害杩炵画璇勫垎锛屾妧鏈寚鏍囨暟鍊奸潰鏉?|
| 淇″彿鍥炴祴 | `/backtest` | 3 绉嶇瓥鐣ユā寮忓洖娴嬶紙瓒嬪娍璺熻釜/涔板叆骞舵寔鏈?娉㈡鎿嶄綔锛夛紝缁熻+浜ゆ槗鏄庣粏 |
| 涓偂鍘嗗彶K绾?| `/chart` | 铚＄儧鍥?+ MA/甯冩灄甯?EMA澶氱┖甯?鎴愪氦閲?MACD/RSI 澶氱獥鏍艰仈鍔?|
| 鏍囩殑绠＄悊 | `/watchlist-manage` | 鏍囩殑姹犲鍒犳敼鏌?+ 绛涢€?+ 鎺ㄨ崘绛栫暐 + 鍒锋柊蹇収 |
| ~~涓偂鍩烘湰闈㈠垎鏋悀~ | `/fundamental` | *鏆傛椂闅愯棌* |
| ~~缃戞牸浜ゆ槗~~ | `/grid-trading` | *鏆傛椂闅愯棌* |

## 瀵艰埅缁撴瀯

```
甯傚満娓╁害 | 浜ゆ槗淇″彿 鈻?绌鸿浆澶?澶氳浆绌?涓诲崌娴緳澶?涓昏穼娴秴鍗? | 涓偂鍒嗘瀽 鈻?| 淇″彿鍥炴祴 | 鏍囩殑绠＄悊
                              鈹溾攢 涓偂鎶€鏈垎鏋?                              鈹斺攢 涓偂鍘嗗彶K绾?```

## 璁よ瘉

> **v2.8+**: 璁よ瘉妯″潡鏆傛椂绂佺敤銆傛墍鏈夐〉闈㈠叕寮€璁块棶锛屾棤闇€鐧诲綍銆?
## 鎶€鏈爤

| 鐢ㄩ€?| 搴?| 璇存槑 |
|------|-----|------|
| 妗嗘灦 | Vue 3 | Composition API + `<script setup>` |
| 鏋勫缓 | Vite 5 | 寮€鍙戞湇鍔″櫒 + 鐢熶骇鏋勫缓 |
| UI 缁勪欢 | Ant Design Vue 4 | 甯冨眬銆佸崱鐗囥€佽〃鍗曘€佹爣绛俱€佽〃鏍肩瓑 |
| 鍥捐〃 | ECharts 6 | K 绾?+ 澶氱獥鏍兼妧鏈寚鏍?+ 甯傚満娓╁害瓒嬪娍 |
| HTTP | Axios | API 璇锋眰 |
| 璺敱 | Vue Router 4 | 椤甸潰瀵艰埅 |

## 鍚庣 API

| 鎺ュ彛 | 璇存槑 | 椤甸潰 |
|------|------|------|
| `GET /api/market-temperature` | 甯傚満娓╁害 | MarketTemperature |
| `GET /api/market-temperature/history` | 娓╁害鍘嗗彶 | MarketTemperature |
| `GET /api/scores/overview` | 璇勫垎閫熻+鍔ㄩ噺榫欏ご | MomentumLeaders |
| `GET /api/ema-cross-signals` | EMA 浜ゅ弶淇″彿锛堢┖杞/澶氳浆绌猴級 | MomentumLeaders |
| `GET /api/scores/latest` | 涓偂璇勫垎 | Dashboard |
| `GET /api/indicators` | K 绾?鎸囨爣 | Chart |
| `GET /api/indicators/latest` | 鏈€鏂版寚鏍?| Dashboard |
| `GET /api/backtest/run` | 淇″彿鍥炴祴 | Backtest |
| `GET /api/watchlist` | 鏍囩殑姹?| 澶氬 |
| `POST/PATCH/DELETE /api/watchlist` | 鏍囩殑绠＄悊 | WatchlistManage |
| `GET /health` | 鍋ュ悍妫€鏌?| App.vue |

## 鐩綍缁撴瀯

```
src/
鈹溾攢鈹€ api/trader.js              # 鎵€鏈夊悗绔?API 璋冪敤鍑芥暟
鈹溾攢鈹€ components/
鈹?  鈹溾攢鈹€ IndicatorChart.vue     # ECharts 澶氱獥鏍煎浘琛ㄧ粍浠?鈹?  鈹斺攢鈹€ KLineChart.vue         # 鏃у浘琛ㄧ粍浠讹紙鏈娇鐢級
鈹溾攢鈹€ views/
鈹?  鈹溾攢鈹€ Home.vue               # 棣栭〉
鈹?  鈹溾攢鈹€ MarketTemperature.vue  # 甯傚満娓╁害浠〃鐩?鈹?  鈹溾攢鈹€ ScoresOverview.vue     # 鏈轰細閫熻锛堜环鍊硷級
鈹?  鈹溾攢鈹€ Chart.vue              # K 绾垮浘鏌ヨ椤?鈹?  鈹溾攢鈹€ Dashboard.vue          # 涓偂鎶€鏈垎鏋?鈹?  鈹溾攢鈹€ Fundamental.vue        # 鍩烘湰闈㈠垎鏋愶紙鏆傛椂闅愯棌锛?鈹?  鈹溾攢鈹€ Backtest.vue           # 淇″彿鍥炴祴
鈹?  鈹溾攢鈹€ GridTrading.vue        # 缃戞牸浜ゆ槗锛堟殏鏃堕殣钘忥級
鈹?  鈹溾攢鈹€ WatchlistManage.vue    # 鏍囩殑姹犵鐞?鈹?  鈹溾攢鈹€ Login.vue              # 鐧诲綍椤碉紙鏆傛椂绂佺敤锛?鈹?  鈹溾攢鈹€ StockFilter.vue        # 鏉′欢閫夎偂锛堟殏鏃堕殣钘忥級
鈹?  鈹斺攢鈹€ Settings.vue           # 璁剧疆锛堟殏鏃堕殣钘忥級
鈹溾攢鈹€ router/index.js            # 璺敱閰嶇疆
鈹溾攢鈹€ App.vue                    # 鏍圭粍浠讹紙瀵艰埅 + 鍋ュ悍妫€鏌ワ級
鈹斺攢鈹€ main.js                    # 鍏ュ彛鏂囦欢
```

璇︾粏鎶€鏈柟妗堣 [docs/architecture.md](docs/architecture.md)銆?
