<#import "template.ftl" as layout>
<#import "hw-brand.ftl" as brand>
<@layout.registrationLayout displayInfo=false displayMessage=false; section>
    <#if section = "form">
        <main class="auth-shell">
            <@brand.brandPanel/>

            <section class="form-panel" aria-label="Two-step verification">
                <div class="form-wrap">
                    <@brand.mobileBrand/>

                    <div class="form-heading">
                        <span class="form-heading__kicker">Two-step verification</span>
                        <h2>Enter your one-time code</h2>
                        <p>Open your authenticator app and type the code it shows for House of Wealth.</p>
                    </div>

                    <#if !messagesPerField.existsError('totp')><@brand.feedback/></#if>

                    <form id="kc-otp-login-form" class="login-form otp-form" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                        <#if otpLogin.userOtpCredentials?size gt 1>
                            <span class="field-label">Authenticator</span>
                            <div class="otp-devices">
                                <#list otpLogin.userOtpCredentials as otpCredential>
                                    <label class="otp-device">
                                        <input type="radio" name="selectedCredentialId" value="${otpCredential.id}" <#if otpCredential.id == otpLogin.selectedCredentialId>checked</#if>>
                                        <span>${otpCredential.userLabel}</span>
                                    </label>
                                </#list>
                            </div>
                        </#if>

                        <label class="field-label" for="otp">${msg("loginOtpOneTime")}</label>
                        <div class="input-wrap input-wrap--otp">
                            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M10 2.5 4 5v4.5c0 3.6 2.5 6.6 6 8 3.5-1.4 6-4.4 6-8V5l-6-2.5Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="m7.5 10 1.8 1.8 3.4-3.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            <input id="otp" name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="000000" autofocus dir="ltr"
                                   aria-invalid="<#if messagesPerField.existsError('totp')>true</#if>" />
                        </div>
                        <#if messagesPerField.existsError('totp')>
                            <span class="field-error" aria-live="polite">${kcSanitize(messagesPerField.get('totp'))?no_esc}</span>
                        </#if>

                        <button class="submit-button" name="login" id="kc-login" type="submit">
                            Verify <span aria-hidden="true">→</span>
                        </button>
                    </form>

                    <p class="form-note"><a class="text-button" href="${url.loginRestartFlowUrl}">← Back to sign in</a></p>

                    <@brand.securityNote/>
                </div>
            </section>
        </main>
    </#if>
</@layout.registrationLayout>
