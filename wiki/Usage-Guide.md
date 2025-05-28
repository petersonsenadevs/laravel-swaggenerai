# Usage Guide

## Basic Usage

1. **Generate Documentation**
   ```bash
   Ctrl+Shift+P → Laravel Swagger: Generate Documentation
   ```

2. **Change AI Provider**
   ```bash
   Ctrl+Shift+P → Laravel Swagger: Select AI Provider
   ```

3. **Update API Key**
   ```bash
   Ctrl+Shift+P → Laravel Swagger: Update API Key
   ```

## Generated Files Structure

```
your-laravel-project/
├── app/
│   ├── Annotations/
│   │   └── Swagger/
│   │       ├── BaseConfig.php
│   │       └── [ControllerName]/
│   │           └── [MethodName]Annotations.php
```

## Best Practices

1. Keep controllers well-documented
2. Use clear method names
3. Define request validation rules
4. Use proper route naming