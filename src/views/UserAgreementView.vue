<script setup>
import { useRouter } from "vue-router";
const router = useRouter();
const onAgree = () => {
  localStorage.setItem("agreement-checked", "true");
  router.push("/login?checked=true");
};
</script>

<template>
  <div class="agreement-page">
    <div class="agreement-card">
      <h1 class="agreement-title">用户协议</h1>
      <p class="agreement-date">生效日期：2026年5月28日</p>

      <section class="section">
        <h2>一、接受协议</h2>
        <p>欢迎使用Y社区。访问或使用本服务，即表示您同意受本协议的约束。如您不同意本协议的任何内容，请立即停止访问或使用本服务。</p>
      </section>

      <section class="section">
        <h2>二、注册与账户</h2>
        <p>1. 用户在注册时应提供真实、准确的个人信息。</p>
        <p>2. 用户应妥善保管账户信息，对以该账户进行的所有活动负责。</p>
        <p>3. 如发现任何未经授权的账户使用情况，用户应立即通知平台。</p>
      </section>

      <section class="section">
        <h2>三、用户行为规范</h2>
        <p>用户在使用本服务时，必须遵守国家法律法规，不得利用本服务从事以下行为：</p>
        <p>1. 发布违反国家法律法规的内容；</p>
        <p>2. 侵犯他人知识产权、商业秘密或其他合法权益；</p>
        <p>3. 发布垃圾广告、恶意刷屏等扰乱平台秩序的内容；</p>
        <p>4. 利用本平台从事网络诈骗、传销等违法活动；</p>
        <p>5. 其他违反法律法规或社会公序良俗的行为。</p>
      </section>

      <section class="section">
        <h2>四、内容版权</h2>
        <p>1. 用户在平台上发布的内容，版权由发布者所有。</p>
        <p>2. 用户授权平台在非必要范围内免费使用、展示、复制其所发布的内容。</p>
        <p>3. 平台拥有软件系统及相关知识产权。</p>
      </section>

      <section class="section">
        <h2>五、服务协议变更</h2>
        <p>协议如有修改，平台将在站内外公告。继续使用服务即视为接受修改后的协议。</p>
      </section>

      <section class="section">
        <h2>六、服务终止</h2>
        <p>平台有权因各种原因暂停或终止服务，且无需事先通知。平台不对此承担任何责任。</p>
      </section>

      <section class="section">
        <h2>七、其他</h2>
        <p>1. 本协议受中华人民共和国法律管辖。</p>
        <p>2. 如本协议任何条款被认定为无效，其余条款仍然有效。</p>
        <p>3. 最终解释权归Y社区所有。</p>
      </section>

      <div class="agree-bar">
        <el-button type="primary" @click="onAgree">我同意，前往登录</el-button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.agreement-page {
  min-height: 100vh;
  background: var(--bg-page);
  padding: 40px 20px;
}

.agreement-card {
  max-width: 800px;
  margin: 0 auto;
  padding: 48px 40px;
  background: var(--bg-card);
  border-radius: $radius-xl;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
}

.agreement-title {
  text-align: center;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.agreement-date {
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 32px;
}

.section {
  margin-bottom: 24px;

  h2 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-light);
  }

  p {
    font-size: 14px;
    line-height: 1.8;
    color: var(--text-secondary);
    margin: 0;
  }
}

.agree-bar {
  text-align: center;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--border-light);

  .el-button {
    background: var(--gradient-primary);
    border: none;
    font-weight: 500;
    padding: 10px 32px;
    transition: all $transition-base;

    &:hover {
      transform: translateY(-1px);
      box-shadow: var(--glow-primary);
    }
  }
}
</style>
