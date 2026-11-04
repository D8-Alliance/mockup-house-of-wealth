<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=false displayMessage=false; section>
    <#if section = "form">
        <main class="auth-shell">
            <section class="brand-panel" aria-label="House of Wealth overview">
                <div class="brand-panel__glow brand-panel__glow--top"></div>
                <div class="brand-panel__glow brand-panel__glow--bottom"></div>
                <header class="brand-header">
                    <span class="brand-mark">
                        <span class="brand-mark__icon" aria-hidden="true">
                            <svg viewBox="0 0 32 32" fill="none"><path d="M7 14.5 16 7l9 7.5v10H7v-10Z" stroke="currentColor" stroke-width="1.8"/><path d="M10.5 14.5h11M12 17.5h8M13.5 20.5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 4.5v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                        </span>
                        <span><strong>House of</strong> Wealth</span>
                    </span>
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

            <section class="form-panel" aria-label="Account access">
                <div class="form-wrap">
                    <div class="mobile-brand">
                        <span class="brand-mark__icon" aria-hidden="true">
                            <svg viewBox="0 0 32 32" fill="none"><path d="M7 14.5 16 7l9 7.5v10H7v-10Z" stroke="currentColor" stroke-width="1.8"/><path d="M10.5 14.5h11M12 17.5h8M13.5 20.5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 4.5v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                        </span>
                        <span><strong>House of</strong> Wealth</span>
                    </div>

                    <div class="form-heading">
                        <span class="form-heading__kicker">Welcome back</span>
                        <h2>Sign in to your workspace</h2>
                        <p>Use your corporate credentials to continue.</p>
                    </div>

                    <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
                        <div class="auth-tabs" role="tablist" aria-label="Account access">
                            <span class="auth-tab auth-tab--active" role="tab" aria-selected="true">Sign In</span>
                            <a class="auth-tab" role="tab" aria-selected="false" href="${url.registrationUrl}">Register</a>
                        </div>
                    </#if>

                    <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                        <p class="form-feedback form-feedback--visible form-feedback--${message.type}" role="alert">
                            ${kcSanitize(message.summary)?no_esc}
                        </p>
                    </#if>

                    <#if realm.password>
                        <form id="kc-form-login" class="login-form" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                            <#if !usernameHidden??>
                                <div class="field-row">
                                    <label class="field-label" for="username">
                                        <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
                                    </label>
                                </div>
                                <div class="input-wrap">
                                    <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M3.5 5.5h13v9h-13v-9Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="m4 6 6 4.5L16 6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
                                    <input tabindex="1" id="username" name="username" type="text" value="${(login.username!'')}" placeholder="e.g. ahmad.razak@company.com" autofocus autocomplete="off"
                                           aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
                                </div>
                                <#if messagesPerField.existsError('username','password')>
                                    <span class="field-error" aria-live="polite">${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}</span>
                                </#if>
                            </#if>

                            <div class="field-row field-row--password">
                                <label class="field-label" for="password">${msg("password")}</label>
                                <#if realm.resetPasswordAllowed>
                                    <a class="text-button" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
                                </#if>
                            </div>
                            <div class="input-wrap">
                                <svg aria-hidden="true" viewBox="0 0 20 20"><rect x="4" y="8.5" width="12" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
                                <input tabindex="2" id="password" name="password" type="password" placeholder="Enter your password" autocomplete="off"
                                       aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
                                <button class="icon-button" id="toggle-password" type="button" aria-label="Show password">
                                    <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M2.5 10s2.7-4 7.5-4 7.5 4 7.5 4-2.7 4-7.5 4-7.5-4-7.5-4Z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="10" r="1.8" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
                                </button>
                            </div>
                            <#if usernameHidden?? && messagesPerField.existsError('username','password')>
                                <span class="field-error" aria-live="polite">${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}</span>
                            </#if>

                            <#if realm.rememberMe && !usernameHidden??>
                                <label class="terms-row">
                                    <#if login.rememberMe??>
                                        <input id="rememberMe" name="rememberMe" type="checkbox" checked>
                                    <#else>
                                        <input id="rememberMe" name="rememberMe" type="checkbox">
                                    </#if>
                                    <span>${msg("rememberMe")}</span>
                                </label>
                            </#if>

                            <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                            <button tabindex="4" class="submit-button" name="login" id="kc-login" type="submit">
                                ${msg("doLogIn")} <span aria-hidden="true">→</span>
                            </button>
                        </form>
                    </#if>

                    <p class="security-note"><span aria-hidden="true">⌁</span> Your session is protected with enterprise-grade security</p>
                </div>
            </section>
        </main>
    </#if>
</@layout.registrationLayout>
