using System.Security.Cryptography;
using Mono.Cecil;
using Mono.Cecil.Cil;

if (args.Length < 3)
{
    Console.Error.WriteLine("Usage: AssetStudioPatch <assembly.dll> <source-sha256> <patched-sha256>");
    return 2;
}

var assemblyPath = Path.GetFullPath(args[0]);
var expectedSource = args[1].ToLowerInvariant();
var expectedPatched = args[2].ToLowerInvariant();

if (!File.Exists(assemblyPath))
{
    Console.Error.WriteLine($"AssetStudio assembly was not found: {assemblyPath}");
    return 1;
}

var currentHash = Sha256(assemblyPath);
if (currentHash != expectedSource && currentHash != expectedPatched)
{
    Console.Error.WriteLine($"Refusing to patch an unexpected AssetStudio assembly. Expected {expectedSource} or {expectedPatched}, got {currentHash}.");
    return 1;
}

using var assembly = AssemblyDefinition.ReadAssembly(assemblyPath, new ReaderParameters { ReadSymbols = false });
var method = assembly.MainModule.Types
    .FirstOrDefault(type => type.FullName == "AssetStudioCLI.Options.CLIOptions")?
    .Methods.FirstOrDefault(candidate => candidate.Name == "ParseArgs");

if (method is null || !method.HasBody)
{
    Console.Error.WriteLine("AssetStudioCLI.Options.CLIOptions.ParseArgs was not found.");
    return 1;
}

if (HasPatchedSequence(method.Body.Instructions))
{
    if (currentHash != expectedPatched)
    {
        Console.Error.WriteLine("AssetStudio reports the patch sequence but its checksum is not the pinned patched checksum.");
        return 1;
    }

    Console.WriteLine($"AssetStudio animation patch already applied: {assemblyPath}");
    return 0;
}

if (currentHash != expectedSource || !TryFindOriginalSequence(method.Body.Instructions, out var target, out var addMethod))
{
    Console.Error.WriteLine("The expected unpatched animator asset-list sequence was not found.");
    return 1;
}

var temporaryPath = assemblyPath + ".patching";
try
{
    var processor = method.Body.GetILProcessor();
    processor.InsertBefore(target!, processor.Create(OpCodes.Dup));
    processor.InsertBefore(target!, processor.Create(OpCodes.Ldc_I4_S, (sbyte)74));
    processor.InsertBefore(target!, processor.Create(OpCodes.Callvirt, addMethod!));
    assembly.Write(temporaryPath);

    var patchedHash = Sha256(temporaryPath);
    if (patchedHash != expectedPatched)
    {
        Console.Error.WriteLine($"Patched AssetStudio checksum mismatch. Expected {expectedPatched}, got {patchedHash}.");
        return 1;
    }

    assembly.Dispose();
    File.Move(temporaryPath, assemblyPath, true);
    Console.WriteLine($"Applied AssetStudio animation patch: {assemblyPath}");
    return 0;
}
finally
{
    if (File.Exists(temporaryPath)) File.Delete(temporaryPath);
}

static bool TryFindOriginalSequence(Mono.Collections.Generic.Collection<Instruction> instructions, out Instruction? target, out MethodReference? addMethod)
{
    target = null;
    addMethod = null;
    for (var index = 0; index + 3 < instructions.Count; index++)
    {
        if (instructions[index].OpCode.Code != Code.Newobj
            || instructions[index + 1].OpCode.Code != Code.Dup
            || Int32Constant(instructions[index + 2]) != 95
            || instructions[index + 3].OpCode.Code is not (Code.Callvirt or Code.Call)
            || instructions[index + 3].Operand is not MethodReference method)
        {
            continue;
        }

        target = instructions[index + 1];
        addMethod = method;
        return true;
    }

    return false;
}

static bool HasPatchedSequence(Mono.Collections.Generic.Collection<Instruction> instructions)
{
    for (var index = 0; index + 7 < instructions.Count; index++)
    {
        if (instructions[index].OpCode.Code != Code.Newobj
            || instructions[index + 1].OpCode.Code != Code.Dup
            || Int32Constant(instructions[index + 2]) != 74
            || instructions[index + 3].OpCode.Code is not (Code.Callvirt or Code.Call)
            || instructions[index + 3].Operand is not MethodReference
            || instructions[index + 4].OpCode.Code != Code.Dup
            || Int32Constant(instructions[index + 5]) != 95
            || instructions[index + 6].OpCode.Code is not (Code.Callvirt or Code.Call))
        {
            continue;
        }

        return true;
    }

    return false;
}

static int? Int32Constant(Instruction instruction)
{
    return instruction.OpCode.Code switch
    {
        Code.Ldc_I4_M1 => -1,
        Code.Ldc_I4_0 => 0,
        Code.Ldc_I4_1 => 1,
        Code.Ldc_I4_2 => 2,
        Code.Ldc_I4_3 => 3,
        Code.Ldc_I4_4 => 4,
        Code.Ldc_I4_5 => 5,
        Code.Ldc_I4_6 => 6,
        Code.Ldc_I4_7 => 7,
        Code.Ldc_I4_8 => 8,
        Code.Ldc_I4_S => (sbyte)instruction.Operand,
        Code.Ldc_I4 => (int)instruction.Operand,
        _ => null,
    };
}

static string Sha256(string path)
{
    using var stream = File.OpenRead(path);
    return Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
}
