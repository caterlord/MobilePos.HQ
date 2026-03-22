namespace EWHQ.Api.Auditing;

public interface IAuditIngestionService
{
    bool IsEnabled { get; }

    Task PublishRequestAuditAsync(RequestAuditEvent auditEvent, CancellationToken cancellationToken = default);

    Task PublishMutationAuditAsync(MutationAuditEvent auditEvent, CancellationToken cancellationToken = default);
}
