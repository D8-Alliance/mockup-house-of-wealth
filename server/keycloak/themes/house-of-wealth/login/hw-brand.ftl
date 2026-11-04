<#-- Shared pieces of the sign-in layout, used by the OTP pages (login.ftl and register.ftl carry their own copy). -->
<#macro logoIcon>
    <span class="brand-mark__icon" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none"><path d="M7 14.5 16 7l9 7.5v10H7v-10Z" stroke="currentColor" stroke-width="1.8"/><path d="M10.5 14.5h11M12 17.5h8M13.5 20.5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 4.5v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    </span>
</#macro>

<#macro brandPanel>
    <section class="brand-panel" aria-label="House of Wealth overview">
        <div class="brand-panel__glow brand-panel__glow--top"></div>
        <div class="brand-panel__glow brand-panel__glow--bottom"></div>
        <header class="brand-header">
            <span class="brand-mark"><@logoIcon/><span><strong>House of</strong> Wealth</span></span>
            <span class="brand-badge">D-8</span>
        </header>
        <div class="brand-copy">
            <p class="eyebrow">D-8 Enterprise Identity Gateway</p>
            <h1>One secure gateway<br /><span>for shared prosperity.</span></h1>
            <p class="brand-copy__description">Access your role-based financial workspace with confidence, clarity, and control.</p>
        </div>
        <div class="brand-footer">
            <span class="status-dot"></span><span>All systems operational</span>
            <span class="brand-footer__separator"></span><span>Protected access</span>
        </div>
    </section>
</#macro>

<#macro mobileBrand>
    <div class="mobile-brand"><@logoIcon/><span><strong>House of</strong> Wealth</span></div>
</#macro>

<#macro feedback>
    <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <p class="form-feedback form-feedback--visible form-feedback--${message.type}" role="alert">${kcSanitize(message.summary)?no_esc}</p>
    </#if>
</#macro>

<#macro securityNote>
    <p class="security-note"><span aria-hidden="true">⌁</span> Your session is protected with enterprise-grade security</p>
</#macro>
