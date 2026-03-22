using System;
using System.Collections.Generic;

namespace EWHQ.Api.DTOs;

public class LookupItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? AltName { get; set; }
    public string? Code { get; set; }
}

public class LookupOptionsDto
{
    public IReadOnlyList<ButtonStyleDto> ButtonStyles { get; set; } = Array.Empty<ButtonStyleDto>();
    public IReadOnlyList<LookupItemDto> Shops { get; set; } = Array.Empty<LookupItemDto>();
    public IReadOnlyList<LookupItemDto> OrderChannels { get; set; } = Array.Empty<LookupItemDto>();
}
