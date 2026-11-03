# Tiny static file server for local testing only (no admin rights needed).
param([int]$Port = 8765)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "serving $root on http://localhost:$Port/"

$types = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.svg'  = 'image/svg+xml'
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = [System.IO.StreamReader]::new($stream)
    $line = $reader.ReadLine()
    while (($h = $reader.ReadLine()) -ne '' -and $h -ne $null) { }

    $path = ''
    if ($line -match '^GET\s+(\S+)') { $path = $Matches[1] }
    $path = $path.Split('?')[0].TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($path)) { $path = 'best-move.html' }

    $file = Join-Path $root $path
    $status = '200 OK'
    $body = $null
    $ctype = 'application/octet-stream'

    if ((Test-Path $file -PathType Leaf)) {
      $body = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
      if ($types.ContainsKey($ext)) { $ctype = $types[$ext] }
    } else {
      $status = '404 Not Found'
      $body = [System.Text.Encoding]::UTF8.GetBytes('not found')
      $ctype = 'text/plain; charset=utf-8'
    }

    $header = "HTTP/1.1 $status`r`nContent-Type: $ctype`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
    $hb = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($hb, 0, $hb.Length)
    $stream.Write($body, 0, $body.Length)
    $stream.Flush()
  } catch {
    # ignore and keep serving
  } finally {
    $client.Close()
  }
}
