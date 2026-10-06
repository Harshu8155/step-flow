package com.stepflow.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Sends the account-verification email. Best-effort: if SMTP isn't configured
 * (or sending fails), it logs and returns instead of breaking registration.
 * When no mail server is configured it prints the link to the console so you
 * can still test the flow locally.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String fromAddress;

    public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider,
                        @Value("${app.mail.from:no-reply@stepflow.app}") String fromAddress) {
        this.mailSenderProvider = mailSenderProvider;
        this.fromAddress = fromAddress;
    }

    public void sendVerificationEmail(String to, String name, String verifyLink) {
        String body = "Hi " + name + ",\n\n"
                + "Welcome to StepFlow! Tap the link below to verify your account "
                + "and open the app:\n\n" + verifyLink + "\n\n"
                + "If you didn't create this account, you can ignore this email.";

        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            // No SMTP configured — log the link so local testing still works.
            log.warn("Mail not configured. Verification link for {}: {}", to, verifyLink);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject("Verify your StepFlow account");
            message.setText(body);
            sender.send(message);
            log.info("Verification email sent to {}", to);
        } catch (Exception ex) {
            // Never fail registration because of email problems.
            log.warn("Failed to send verification email to {}: {}", to, ex.getMessage());
            log.warn("Verification link for {}: {}", to, verifyLink);
        }
    }
}
