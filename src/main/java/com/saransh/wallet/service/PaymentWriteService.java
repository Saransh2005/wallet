package com.saransh.wallet.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saransh.wallet.api.dto.PaymentDtos.CreatePaymentRequest;
import com.saransh.wallet.api.dto.PaymentDtos.PaymentResponse;
import com.saransh.wallet.config.PaymentProperties;
import com.saransh.wallet.domain.Account;
import com.saransh.wallet.domain.OutboxEvent;
import com.saransh.wallet.domain.Payment;
import com.saransh.wallet.domain.PaymentStatus;
import com.saransh.wallet.exception.AccountNotFoundException;
import com.saransh.wallet.exception.CurrencyMismatchException;
import com.saransh.wallet.kafka.event.EventTypes;
import com.saransh.wallet.kafka.event.PaymentSubmittedEvent;
import com.saransh.wallet.repository.AccountRepository;
import com.saransh.wallet.repository.OutboxEventRepository;
import com.saransh.wallet.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Kept as its own Spring bean (rather than a method on
 * {@link PaymentSubmissionService}) purely so that {@code @Transactional}
 * is honored: Spring's proxy-based transactions only intercept calls that
 * arrive through the bean proxy, and a method calling another method on
 * {@code this} bypasses that proxy entirely (the classic "self-invocation"
 * pitfall). Splitting the transactional write into a separate, injected
 * collaborator sidesteps that.
 */
@Service
@RequiredArgsConstructor
public class PaymentWriteService {

    private final AccountRepository accountRepository;
    private final PaymentRepository paymentRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final PaymentProperties paymentProperties;
    private final ObjectMapper objectMapper;

    @Transactional
    public PaymentResponse createPaymentAndEnqueue(CreatePaymentRequest request, String idempotencyKey) {
        Account from = accountRepository.findById(request.fromAccountId())
            .orElseThrow(() -> new AccountNotFoundException(request.fromAccountId()));
        Account to = accountRepository.findById(request.toAccountId())
            .orElseThrow(() -> new AccountNotFoundException(request.toAccountId()));

        if (!from.getCurrency().equals(request.currency()) || !to.getCurrency().equals(request.currency())) {
            throw new CurrencyMismatchException(
                "Payment currency " + request.currency() + " does not match account currency");
        }

        Payment payment = Payment.builder()
            .id(UUID.randomUUID())
            .fromAccountId(from.getId())
            .toAccountId(to.getId())
            .amount(request.amount())
            .currency(request.currency())
            .status(PaymentStatus.PENDING)
            .idempotencyKey(idempotencyKey)
            .build();
        paymentRepository.save(payment);

        PaymentSubmittedEvent event = new PaymentSubmittedEvent(
            payment.getId(), from.getId(), to.getId(), payment.getAmount(), payment.getCurrency(), Instant.now());

        OutboxEvent outboxEvent = OutboxEvent.builder()
            .id(UUID.randomUUID())
            .aggregateType("Payment")
            .aggregateId(payment.getId())
            .eventType(EventTypes.PAYMENT_SUBMITTED)
            .topic(paymentProperties.getSubmittedTopic())
            // Keying by the source account keeps all of one account's outgoing
            // payments in the same Kafka partition, so they are processed in
            // the order they were submitted.
            .partitionKey(from.getId().toString())
            .payload(writeJson(event))
            .build();
        outboxEventRepository.save(outboxEvent);

        return toResponse(payment);
    }

    private PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(payment.getId(), payment.getFromAccountId(), payment.getToAccountId(),
            payment.getAmount(), payment.getCurrency(), payment.getStatus().name(), payment.getFailureReason(),
            payment.getCreatedAt(), payment.getUpdatedAt());
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize outbox event payload", e);
        }
    }
}
