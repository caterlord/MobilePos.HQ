using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("PromoDetail_tracking")]
public class PromoDetail_tracking
{
    public int PromoDetailId { get; set; }

    public int AccountId { get; set; }

    public int? update_scope_local_id { get; set; }

    public int? scope_update_peer_key { get; set; }

    public long? scope_update_peer_timestamp { get; set; }

    public int local_update_peer_key { get; set; }

    public long local_update_peer_timestamp { get; set; }

    public int? create_scope_local_id { get; set; }

    public int? scope_create_peer_key { get; set; }

    public long? scope_create_peer_timestamp { get; set; }

    public int local_create_peer_key { get; set; }

    public long local_create_peer_timestamp { get; set; }

    public int sync_row_is_tombstone { get; set; }

    public DateTime? last_change_datetime { get; set; }

}
