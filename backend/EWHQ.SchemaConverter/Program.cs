using System.Text;
using System.Text.RegularExpressions;

namespace EWHQ.SchemaConverter;

class Program
{
    static void Main(string[] args)
    {
        var projectRoot = GetProjectRoot();
        var schemaPath = args.Length > 0 ? args[0] : Path.Combine(projectRoot, "docs", "db_schema_ewpos_userdata.txt");
        var outputPath = args.Length > 1 ? args[1] : Path.Combine(projectRoot, "backend", "EWHQ.Api", "Models", "Entities");

        if (!File.Exists(schemaPath))
        {
            Console.WriteLine($"Schema file not found: {schemaPath}");
            return;
        }

        if (!Directory.Exists(outputPath))
        {
            Directory.CreateDirectory(outputPath);
        }

        var schemaContent = File.ReadAllText(schemaPath);
        var tables = ParseTables(schemaContent);

        foreach (var table in tables)
        {
            var entityClass = GenerateEntityClass(table);
            var fileName = Path.Combine(outputPath, $"{table.ClassName}.cs");
            File.WriteAllText(fileName, entityClass);
            Console.WriteLine($"Generated: {fileName}");
        }

        Console.WriteLine($"\nSuccessfully generated {tables.Count} entity classes.");
    }

    static string GetProjectRoot()
    {
        var currentDir = Directory.GetCurrentDirectory();
        while (!File.Exists(Path.Combine(currentDir, "ewhq.sln")) && currentDir != Path.GetPathRoot(currentDir))
        {
            currentDir = Directory.GetParent(currentDir)?.FullName ?? currentDir;
        }

        if (!File.Exists(Path.Combine(currentDir, "ewhq.sln")))
        {
            currentDir = Directory.GetParent(Directory.GetCurrentDirectory())?.Parent?.FullName ?? currentDir;
        }

        return currentDir;
    }

    static List<TableDefinition> ParseTables(string schemaContent)
    {
        var tables = new List<TableDefinition>();
        var tablePattern = @"CREATE TABLE \[dbo\]\.\[(\w+)\]\s*\((.*?)\)\s*ON\s*\[PRIMARY\]";
        var matches = Regex.Matches(schemaContent, tablePattern, RegexOptions.Singleline);

        foreach (Match match in matches)
        {
            var tableName = match.Groups[1].Value;
            var tableContent = match.Groups[2].Value;
            
            var table = new TableDefinition
            {
                TableName = tableName,
                ClassName = tableName,
                Columns = ParseColumns(tableContent)
            };
            
            tables.Add(table);
        }

        return tables;
    }

    static List<ColumnDefinition> ParseColumns(string tableContent)
    {
        var columns = new List<ColumnDefinition>();
        var lines = tableContent.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        
        foreach (var line in lines)
        {
            var trimmedLine = line.Trim();
            
            // Skip constraint definitions
            if (trimmedLine.StartsWith("CONSTRAINT") || trimmedLine.StartsWith("PRIMARY KEY") || 
                trimmedLine.StartsWith("UNIQUE") || trimmedLine.StartsWith("WITH") || 
                trimmedLine.StartsWith(")") || string.IsNullOrWhiteSpace(trimmedLine))
                continue;

            // Parse column definition
            var columnMatch = Regex.Match(trimmedLine, @"\[(\w+)\]\s+\[(\w+)\](?:\(([^)]+)\))?\s*(IDENTITY(?:\([^)]+\))?)?\s*(NOT NULL|NULL)?");
            
            if (columnMatch.Success)
            {
                var column = new ColumnDefinition
                {
                    ColumnName = columnMatch.Groups[1].Value,
                    SqlType = columnMatch.Groups[2].Value,
                    Size = columnMatch.Groups[3].Value,
                    IsIdentity = columnMatch.Groups[4].Value.Contains("IDENTITY"),
                    IsNullable = !columnMatch.Groups[5].Value.Contains("NOT NULL")
                };
                
                columns.Add(column);
            }
        }

        return columns;
    }

    static string GenerateEntityClass(TableDefinition table)
    {
        var sb = new StringBuilder();
        
        // Add using statements
        sb.AppendLine("using System.ComponentModel.DataAnnotations;");
        sb.AppendLine("using System.ComponentModel.DataAnnotations.Schema;");
        sb.AppendLine();
        sb.AppendLine("namespace EWHQ.Api.Models.Entities;");
        sb.AppendLine();
        
        // Add class declaration
        sb.AppendLine($"[Table(\"{table.TableName}\")]");
        sb.AppendLine($"public class {table.ClassName}");
        sb.AppendLine("{");
        
        // Identify primary key columns
        var keyColumns = IdentifyKeyColumns(table);
        
        // Add properties
        foreach (var column in table.Columns)
        {
            // Add key attribute if it's a primary key
            if (keyColumns.Contains(column.ColumnName))
            {
                sb.AppendLine("    [Key]");
                if (keyColumns.Count > 1)
                {
                    var order = keyColumns.IndexOf(column.ColumnName);
                    sb.AppendLine($"    [Column(Order = {order})]");
                }
            }
            
            // Add MaxLength attribute for string types
            if (column.CSharpType == "string" && !string.IsNullOrEmpty(column.Size))
            {
                sb.AppendLine($"    [MaxLength({column.Size})]");
            }
            
            // Add Column attribute for decimal types with precision
            if (column.SqlType == "decimal" && !string.IsNullOrEmpty(column.Size))
            {
                sb.AppendLine($"    [Column(TypeName = \"decimal({column.Size})\")]");
            }
            
            // Add Required attribute for non-nullable strings
            if (column.CSharpType == "string" && !column.IsNullable)
            {
                sb.AppendLine("    [Required]");
            }
            
            // Add property
            var nullableSymbol = column.IsNullable ? "?" : "";
            var defaultValue = column.CSharpType switch
            {
                "string" when !column.IsNullable => " = string.Empty;",
                "byte[]" when !column.IsNullable => " = null!;",
                _ => ""
            };

            sb.AppendLine($"    public {column.CSharpType}{nullableSymbol} {column.ColumnName} {{ get; set; }}{defaultValue}");
            sb.AppendLine();
        }
        
        sb.AppendLine("}");
        
        return sb.ToString();
    }

    static List<string> IdentifyKeyColumns(TableDefinition table)
    {
        var keyColumns = new List<string>();
        
        // Common patterns for primary keys
        if (table.Columns.Any(c => c.ColumnName == $"{table.TableName}Id"))
        {
            keyColumns.Add($"{table.TableName}Id");
        }
        else if (table.Columns.Any(c => c.ColumnName == "Id"))
        {
            keyColumns.Add("Id");
        }
        else if (table.Columns.Any(c => c.ColumnName.EndsWith("Id") && c.IsIdentity))
        {
            keyColumns.Add(table.Columns.First(c => c.ColumnName.EndsWith("Id") && c.IsIdentity).ColumnName);
        }
        
        // Add AccountId and ShopId if they exist (common composite keys)
        if (table.Columns.Any(c => c.ColumnName == "AccountId") && keyColumns.Count > 0)
        {
            keyColumns.Add("AccountId");
        }
        
        if (table.Columns.Any(c => c.ColumnName == "ShopId") && keyColumns.Count > 0)
        {
            keyColumns.Add("ShopId");
        }
        
        return keyColumns;
    }
}

class TableDefinition
{
    public string TableName { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public List<ColumnDefinition> Columns { get; set; } = new List<ColumnDefinition>();
}

class ColumnDefinition
{
    public string ColumnName { get; set; } = string.Empty;
    public string SqlType { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public bool IsIdentity { get; set; }
    public bool IsNullable { get; set; }
    
    public string CSharpType
    {
        get
        {
            return SqlType.ToLower() switch
            {
                "int" => "int",
                "bigint" => "long",
                "smallint" => "short",
                "tinyint" => "byte",
                "bit" => "bool",
                "decimal" => "decimal",
                "numeric" => "decimal",
                "money" => "decimal",
                "smallmoney" => "decimal",
                "float" => "double",
                "real" => "float",
                "datetime" => "DateTime",
                "datetime2" => "DateTime",
                "date" => "DateTime",
                "time" => "TimeSpan",
                "datetimeoffset" => "DateTimeOffset",
                "char" => "string",
                "varchar" => "string",
                "text" => "string",
                "nchar" => "string",
                "nvarchar" => "string",
                "ntext" => "string",
                "binary" => "byte[]",
                "varbinary" => "byte[]",
                "image" => "byte[]",
                "uniqueidentifier" => "Guid",
                _ => "object"
            };
        }
    }
}
