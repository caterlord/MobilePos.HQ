# EWHQ Schema Converter

A command-line tool that converts SQL Server database schema scripts into C# Entity Framework Core entity classes.

## Purpose

This tool automates the tedious process of creating C# entity classes from existing SQL Server database schemas. It reads CREATE TABLE statements from a SQL script file and generates properly annotated entity classes ready for use with Entity Framework Core.

## Features

- **Automatic Type Mapping**: Converts SQL Server data types to appropriate C# types
- **Data Annotations**: Generates proper attributes including `[Key]`, `[Required]`, `[MaxLength]`, `[Column]`, and `[Table]`
- **Composite Key Support**: Detects and configures multi-column primary keys
- **Nullable Reference Types**: Generates C# 9+ compliant code with nullable annotations
- **Identity Column Detection**: Recognizes auto-incrementing columns
- **Precision Handling**: Preserves decimal precision and scale

## Prerequisites

- .NET 9.0 SDK
- SQL Server schema script file

## Usage

### Basic Usage

From the project directory:

```bash
cd backend/EWHQ.SchemaConverter
dotnet run
```

This uses the repo-local default paths:

- `docs/db_schema_ewpos_userdata.txt`
- `backend/EWHQ.Api/Models/Entities`

### Custom Paths

Specify custom input and output paths:

```bash
dotnet run "C:\path\to\schema.sql" "C:\path\to\output\entities"
```

Parameters:
1. **Input Path**: Path to the SQL schema file containing CREATE TABLE statements
2. **Output Path**: Directory where generated entity classes will be saved

### From Solution Root

```bash
dotnet run --project backend/EWHQ.SchemaConverter/EWHQ.SchemaConverter.csproj -- "schema.sql" "output/path"
```

## Input Format

The tool expects a SQL script file containing CREATE TABLE statements. Example:

```sql
CREATE TABLE [dbo].[User](
    [UserId] [int] NOT NULL,
    [AccountId] [int] NOT NULL,
    [ShopId] [int] NOT NULL,
    [UserName] [nvarchar](50) NOT NULL,
    [UserAltName] [nvarchar](50) NOT NULL,
    [Email] [nvarchar](100) NULL,
    [IsActive] [bit] NOT NULL,
    [CreatedDate] [datetime] NOT NULL,
    [ModifiedDate] [datetime] NULL,
    [Balance] [decimal](18, 2) NOT NULL,
    CONSTRAINT [PK_User] PRIMARY KEY CLUSTERED 
    (
        [UserId] ASC,
        [AccountId] ASC,
        [ShopId] ASC
    )
)
```

## Output Example

The above SQL table generates this C# entity class:

```csharp
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("User")]
public class User
{
    [Key]
    [Column(Order = 0)]
    public int UserId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [MaxLength(50)]
    [Required]
    public string UserName { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string UserAltName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Email { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? ModifiedDate { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal Balance { get; set; }
}
```

## Type Mappings

| SQL Server Type | C# Type |
|----------------|---------|
| int | int |
| bigint | long |
| smallint | short |
| tinyint | byte |
| bit | bool |
| decimal, numeric, money | decimal |
| float | double |
| real | float |
| datetime, datetime2, date | DateTime |
| time | TimeSpan |
| uniqueidentifier | Guid |
| nvarchar, varchar, nchar, char, text | string |
| varbinary, binary, image | byte[] |

## Key Detection Rules

The tool identifies primary keys using these rules:

1. **Identity columns** ending with "Id"
2. Columns named **"{TableName}Id"** (e.g., UserId for User table)
3. Columns simply named **"Id"**
4. **Composite keys** are detected when AccountId and ShopId are present

## Special Handling

### MaxLength Unlimited
For columns without specified length or with MAX length, the tool adds a custom `[MaxLengthUnlimited]` attribute.

### Decimal Precision
Decimal columns preserve their precision and scale using `[Column(TypeName = "decimal(p, s)")]`.

### Nullable Reference Types
- Non-nullable strings are initialized with `= string.Empty;`
- Non-nullable byte arrays are initialized with `= null!;`
- Nullable strings use C# nullable reference type syntax (`string?`)
- Nullable byte arrays use C# nullable reference type syntax (`byte[]?`)

### Existing Entities With Stricter Semantics
If an existing entity is intentionally stricter than the database for nullable columns, use
`scripts/align_entity_nullability.py` to align only invalid DB-non-null mismatches without
weakening those stricter properties.

### Composite Keys
When multiple key columns are detected, they're annotated with `[Column(Order = n)]` to specify key order.

## Best Practices

1. **Review Generated Code**: Always review the generated entities for accuracy
2. **Custom Logic**: Add navigation properties and custom logic after generation
3. **Version Control**: Commit both the SQL schema and generated entities
4. **Regeneration**: When schema changes, regenerate affected entities

## Limitations

- Only processes CREATE TABLE statements (not views, stored procedures, etc.)
- Doesn't generate navigation properties or relationships
- Foreign key constraints are not converted to navigation properties
- Computed columns may need manual adjustment

## Troubleshooting

### No entities generated
- Verify the SQL file contains valid CREATE TABLE statements
- Check that the file path is correct
- Ensure the file encoding is compatible (UTF-8 recommended)

### Missing attributes
- Some complex constraints may require manual addition
- Check indexes and unique constraints need manual configuration

### Type conversion issues
- Review custom SQL types that may need manual mapping
- User-defined types are not supported

## Extending the Converter

To add support for new SQL types or custom attributes:

1. Modify the `MapSqlTypeToCSharp` method for new type mappings
2. Update the regex patterns for parsing new SQL syntax
3. Add new attribute generation logic as needed
