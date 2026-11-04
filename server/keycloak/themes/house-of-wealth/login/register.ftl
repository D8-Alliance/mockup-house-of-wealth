<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false displayRequiredFields=false; section>
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
                    <p class="brand-copy__description">Create your organisation's access to the D-8 network.</p>
                </div>
                <div class="brand-footer">
                    <span class="status-dot"></span><span>All systems operational</span>
                    <span class="brand-footer__separator"></span><span>Protected access</span>
                </div>
            </section>

            <section class="form-panel" aria-label="Create account">
                <div class="form-wrap">
                    <div class="mobile-brand">
                        <span class="brand-mark__icon" aria-hidden="true">
                            <svg viewBox="0 0 32 32" fill="none"><path d="M7 14.5 16 7l9 7.5v10H7v-10Z" stroke="currentColor" stroke-width="1.8"/><path d="M10.5 14.5h11M12 17.5h8M13.5 20.5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 4.5v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                        </span>
                        <span><strong>House of</strong> Wealth</span>
                    </div>

                    <div class="form-heading">
                        <span class="form-heading__kicker">Create your account</span>
                        <h2>Join House of Wealth</h2>
                        <p>Create your secure access to the D-8 network.</p>
                    </div>

                    <div class="auth-tabs" role="tablist" aria-label="Account access">
                        <a class="auth-tab" role="tab" aria-selected="false" href="${url.loginUrl}">Sign In</a>
                        <span class="auth-tab auth-tab--active" role="tab" aria-selected="true">Register</span>
                    </div>

                    <#if message?has_content>
                        <p class="form-feedback form-feedback--visible form-feedback--${message.type}" role="alert">
                            ${kcSanitize(message.summary)?no_esc}
                        </p>
                    </#if>

                    <form id="kc-register-form" class="login-form register-form" action="${url.registrationAction}" method="post">
                        <div class="field-row"><label class="field-label" for="firstName">${msg("firstName")}</label></div>
                        <div class="input-wrap">
                            <svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="10" cy="6.5" r="2.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4.5 16c.5-2.6 2.3-4 5.5-4s5 1.4 5.5 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                            <input type="text" id="firstName" name="firstName" value="${(register.formData.firstName!'')}" placeholder="e.g. Ahmad" autocomplete="given-name"
                                   aria-invalid="<#if messagesPerField.existsError('firstName')>true</#if>" />
                        </div>
                        <#if messagesPerField.existsError('firstName')>
                            <span class="field-error">${kcSanitize(messagesPerField.get('firstName'))?no_esc}</span>
                        </#if>

                        <div class="field-row"><label class="field-label" for="lastName">${msg("lastName")}</label></div>
                        <div class="input-wrap">
                            <svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="10" cy="6.5" r="2.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4.5 16c.5-2.6 2.3-4 5.5-4s5 1.4 5.5 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                            <input type="text" id="lastName" name="lastName" value="${(register.formData.lastName!'')}" placeholder="e.g. Razak" autocomplete="family-name"
                                   aria-invalid="<#if messagesPerField.existsError('lastName')>true</#if>" />
                        </div>
                        <#if messagesPerField.existsError('lastName')>
                            <span class="field-error">${kcSanitize(messagesPerField.get('lastName'))?no_esc}</span>
                        </#if>

                        <div class="field-row"><label class="field-label" for="email">${msg("email")}</label></div>
                        <div class="input-wrap">
                            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M3.5 5.5h13v9h-13v-9Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="m4 6 6 4.5L16 6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
                            <input type="text" id="email" name="email" value="${(register.formData.email!'')}" placeholder="name@organization.com" autocomplete="email"
                                   aria-invalid="<#if messagesPerField.existsError('email')>true</#if>" />
                        </div>
                        <#if messagesPerField.existsError('email')>
                            <span class="field-error">${kcSanitize(messagesPerField.get('email'))?no_esc}</span>
                        </#if>

                        <#if !realm.registrationEmailAsUsername>
                            <div class="field-row"><label class="field-label" for="username">${msg("username")}</label></div>
                            <div class="input-wrap">
                                <svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="10" cy="6.5" r="2.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4.5 16c.5-2.6 2.3-4 5.5-4s5 1.4 5.5 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                                <input type="text" id="username" name="username" value="${(register.formData.username!'')}" placeholder="Choose a username" autocomplete="username"
                                       aria-invalid="<#if messagesPerField.existsError('username')>true</#if>" />
                            </div>
                            <#if messagesPerField.existsError('username')>
                                <span class="field-error">${kcSanitize(messagesPerField.get('username'))?no_esc}</span>
                            </#if>
                        </#if>

                        <#if passwordRequired??>
                            <div class="field-row"><label class="field-label" for="password">${msg("password")}</label></div>
                            <div class="input-wrap">
                                <svg aria-hidden="true" viewBox="0 0 20 20"><rect x="4" y="8.5" width="12" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
                                <input type="password" id="password" name="password" placeholder="Min. 8 characters" autocomplete="new-password"
                                       aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>" />
                                <button class="icon-button" id="toggle-password" type="button" aria-label="Show password">
                                    <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M2.5 10s2.7-4 7.5-4 7.5 4 7.5 4-2.7 4-7.5 4-7.5-4-7.5-4Z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="10" r="1.8" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
                                </button>
                            </div>
                            <#if messagesPerField.existsError('password')>
                                <span class="field-error">${kcSanitize(messagesPerField.get('password'))?no_esc}</span>
                            </#if>

                            <div class="field-row"><label class="field-label" for="password-confirm">${msg("passwordConfirm")}</label></div>
                            <div class="input-wrap">
                                <svg aria-hidden="true" viewBox="0 0 20 20"><rect x="4" y="8.5" width="12" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
                                <input type="password" id="password-confirm" name="password-confirm" placeholder="Re-enter password" autocomplete="new-password"
                                       aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>" />
                            </div>
                            <#if messagesPerField.existsError('password-confirm')>
                                <span class="field-error">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</span>
                            </#if>
                        </#if>

                        <label class="terms-row">
                            <input type="checkbox" id="terms-agree" required />
                            <span>I agree to the Terms of Service and the D-8 Shariah-compliant data &amp; governance policy.</span>
                        </label>

                        <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                        <button class="submit-button" type="submit">
                            ${msg("doRegister")} <span aria-hidden="true">→</span>
                        </button>
                    </form>

                    <p class="form-note">Already have an account? <a class="text-button" href="${url.loginUrl}">Sign In</a></p>
                </div>
            </section>
        </main>
    </#if>
</@layout.registrationLayout>
