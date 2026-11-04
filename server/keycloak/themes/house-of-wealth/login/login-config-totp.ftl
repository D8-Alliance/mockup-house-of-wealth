<#import "template.ftl" as layout>
<#import "hw-brand.ftl" as brand>
<@layout.registrationLayout displayInfo=false displayMessage=false displayRequiredFields=false; section>
    <#if section = "form">
        <main class="auth-shell">
            <@brand.brandPanel/>

            <section class="form-panel" aria-label="Set up two-step verification">
                <div class="form-wrap">
                    <@brand.mobileBrand/>

                    <div class="form-heading">
                        <span class="form-heading__kicker">Two-step verification</span>
                        <h2>Set up your authenticator</h2>
                        <p>Each sign-in will ask for a code from this app as well as your password.</p>
                    </div>

                    <#if !messagesPerField.existsError('totp','userLabel')><@brand.feedback/></#if>

                    <ol class="setup-steps">
                        <li>
                            <p>${msg("loginTotpStep1")}</p>
                            <ul class="app-list">
                                <#list totp.supportedApplications as app><li>${msg(app)}</li></#list>
                            </ul>
                        </li>
                        <#if mode?? && mode = "manual">
                            <li>
                                <p>${msg("loginTotpManualStep2")}</p>
                                <p class="secret-key" id="kc-totp-secret-key">${totp.totpSecretEncoded}</p>
                                <a class="text-button" href="${totp.qrUrl}" id="mode-barcode">${msg("loginTotpScanBarcode")}</a>
                            </li>
                            <li>
                                <p>${msg("loginTotpManualStep3")}</p>
                                <ul class="app-list">
                                    <li>${msg("loginTotpType")}: ${msg("loginTotp." + totp.policy.type)}</li>
                                    <li>${msg("loginTotpAlgorithm")}: ${totp.policy.getAlgorithmKey()}</li>
                                    <li>${msg("loginTotpDigits")}: ${totp.policy.digits}</li>
                                    <#if totp.policy.type = "totp">
                                        <li>${msg("loginTotpInterval")}: ${totp.policy.period}</li>
                                    <#elseif totp.policy.type = "hotp">
                                        <li>${msg("loginTotpCounter")}: ${totp.policy.initialCounter}</li>
                                    </#if>
                                </ul>
                            </li>
                        <#else>
                            <li>
                                <p>${msg("loginTotpStep2")}</p>
                                <div class="qr-box"><img id="kc-totp-secret-qr-code" src="data:image/png;base64, ${totp.totpSecretQrCode}" alt="QR code for your authenticator app"></div>
                                <a class="text-button" href="${totp.manualUrl}" id="mode-manual">${msg("loginTotpUnableToScan")}</a>
                            </li>
                        </#if>
                        <li><p>${msg("loginTotpStep3")}</p></li>
                    </ol>

                    <form id="kc-totp-settings-form" class="login-form otp-form" action="${url.loginAction}" method="post">
                        <label class="field-label" for="totp">${msg("authenticatorCode")} <span>Required</span></label>
                        <div class="input-wrap input-wrap--otp">
                            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M10 2.5 4 5v4.5c0 3.6 2.5 6.6 6 8 3.5-1.4 6-4.4 6-8V5l-6-2.5Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="m7.5 10 1.8 1.8 3.4-3.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            <input id="totp" name="totp" type="text" inputmode="numeric" autocomplete="off" placeholder="000000" dir="ltr"
                                   aria-invalid="<#if messagesPerField.existsError('totp')>true</#if>" />
                        </div>
                        <#if messagesPerField.existsError('totp')>
                            <span class="field-error" aria-live="polite">${kcSanitize(messagesPerField.get('totp'))?no_esc}</span>
                        </#if>
                        <input type="hidden" id="totpSecret" name="totpSecret" value="${totp.totpSecret}" />
                        <#if mode??><input type="hidden" id="mode" name="mode" value="${mode}"/></#if>

                        <label class="field-label" for="userLabel">${msg("loginTotpDeviceName")} <#if totp.otpCredentials?size gte 1><span>Required</span></#if></label>
                        <div class="input-wrap">
                            <svg aria-hidden="true" viewBox="0 0 20 20"><rect x="6" y="2.5" width="8" height="15" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M9 15h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                            <input id="userLabel" name="userLabel" type="text" autocomplete="off" placeholder="e.g. My phone" dir="ltr"
                                   aria-invalid="<#if messagesPerField.existsError('userLabel')>true</#if>" />
                        </div>
                        <#if messagesPerField.existsError('userLabel')>
                            <span class="field-error" aria-live="polite">${kcSanitize(messagesPerField.get('userLabel'))?no_esc}</span>
                        </#if>

                        <label class="terms-row">
                            <input type="checkbox" id="logout-sessions" name="logout-sessions" value="on" checked>
                            <span>${msg("logoutOtherSessions")}</span>
                        </label>

                        <button class="submit-button" id="saveTOTPBtn" type="submit">
                            ${msg("doSubmit")} <span aria-hidden="true">→</span>
                        </button>
                        <#if isAppInitiatedAction??>
                            <button class="secondary-button" id="cancelTOTPBtn" type="submit" name="cancel-aia" value="true">${msg("doCancel")}</button>
                        </#if>
                    </form>

                    <@brand.securityNote/>
                </div>
            </section>
        </main>
    </#if>
</@layout.registrationLayout>
