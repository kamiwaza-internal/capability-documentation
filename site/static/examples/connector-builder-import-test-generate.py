#!/usr/bin/env python3
"""Run the three observed Connector Builder API operations on an authorized instance.

The historical receipt passed import, test and generate on a local 1.3.2
component. Deploy timed out, so this example deliberately stops before deploy.
It is a reusable example, not a live acceptance result or release claim.
"""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


def post(base_url, token, path, payload):
    url = base_url.rstrip('/') + path
    body = json.dumps(payload).encode('utf-8')
    request = Request(url, data=body, method='POST', headers={
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    })
    with urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError(f'{path} returned HTTP {response.status}')
        return json.load(response)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', required=True, help='Authorized Connector Builder extension URL')
    parser.add_argument('--openapi-file', type=Path, required=True)
    parser.add_argument('--project-name', required=True)
    parser.add_argument('--token-env', default='KAMIWAZA_TOKEN', help='Environment variable containing an existing bearer token')
    args = parser.parse_args()
    token = os.environ.get(args.token_env)
    if not token:
        parser.error(f'{args.token_env} is unset')
    spec = args.openapi_file.read_text(encoding='utf-8')
    document = json.loads(spec)
    if not isinstance(document, dict) or not document.get('openapi'):
        parser.error('--openapi-file must contain an OpenAPI JSON document')
    servers = document.get('servers') or []
    imported = post(args.base_url, token, '/api/projects/from-import', {
        'name': args.project_name, 'display_name': args.project_name,
        'source_system': 'user-supplied', 'content_type': 'openapi',
        'base_url': servers[0].get('url', '') if servers else '', 'content': spec,
    })
    project = imported.get('result', {}).get('project', {})
    project_id = project.get('id') or project.get('project_id')
    if not project_id:
        raise RuntimeError('Import returned no project id; inspect the response contract before continuing')
    encoded_id = quote(str(project_id), safe='')
    tested = post(args.base_url, token, f'/api/projects/{encoded_id}/test', {})
    if not isinstance(tested.get('results'), list):
        raise RuntimeError('Test response has no endpoint results; generation stopped')
    generated = post(args.base_url, token, f'/api/projects/{encoded_id}/generate', {})
    print(json.dumps({'project_id': project_id,
                      'tested_endpoint_count': len(tested['results']),
                      'generated_response_keys': sorted(generated)}, indent=2))
    print('Deployment was not attempted; the historical deployment observation timed out.')


if __name__ == '__main__':
    main()
