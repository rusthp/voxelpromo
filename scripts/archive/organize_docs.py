import os
import shutil
from pathlib import Path

# Base paths
docs_dir = Path('b:/voxelpromo/docs')
archive_dir = docs_dir / 'archive'

# Create archive structure
(archive_dir / 'fixes').mkdir(parents=True, exist_ok=True)
(archive_dir / 'analysis').mkdir(parents=True, exist_ok=True)
(archive_dir / 'old-reviews').mkdir(parents=True, exist_ok=True)

# Create new structure  
(docs_dir / 'integrations').mkdir(exist_ok=True)
(docs_dir / 'development').mkdir(exist_ok=True)
(docs_dir / 'deployment').mkdir(exist_ok=True)
(docs_dir / 'getting-started').mkdir(exist_ok=True)

moved_count = 0

# Move fixes to archive
for pattern in ['*_FIX.md', '*_FIXES.md', '*QUICK_FIX.md']:
    for file in docs_dir.glob(pattern):
        if not file.is_dir():
            dest = archive_dir / 'fixes' / file.name
            shutil.move(str(file), str(dest))
            print(f'Moved {file.name} to archive/fixes/')
            moved_count += 1

# Move analyses to archive
for pattern in ['*_ANALYSIS.md', '*_ISSUE.md']:
    for file in docs_dir.glob(pattern):
        if not file.is_dir():
            dest = archive_dir / 'analysis' / file.name
            shutil.move(str(file), str(dest))
            print(f'Moved {file.name} to archive/analysis/')
            moved_count += 1

# Move old reviews
for pattern in ['PROJECT_REVIEW*.md', 'IRIS*.md', '*_IMPROVEMENTS_IMPLEMENTED.md']:
    for file in docs_dir.glob(pattern):
        if not file.is_dir():
            dest = archive_dir / 'old-reviews' / file.name
            shutil.move(str(file), str(dest))
            print(f'Moved {file.name} to archive/old-reviews/')
            moved_count += 1

# Move specific old files
old_files = [
    'VERIFICATION_SUMMARY.md',
    'SYSTEM_STATUS.md',
    'OFFERS_DELETION_VERIFICATION.md',
    'NEXT_STEPS.md',  # Desatualizado
    'PROJECT_CHECKLIST.md',  # Desatualizado
    'COVERAGE_IMPROVEMENT_PLAN.md',
    'ROADMAP_TESTING.md'
]

for filename in old_files:
    file_path = docs_dir / filename
    if file_path.exists():
        dest = archive_dir / 'old-reviews' / filename
        shutil.move(str(file_path), str(dest))
        print(f'Moved {filename} to archive/old-reviews/')
        moved_count += 1

print(f'\n✅ Total moved: {moved_count} files')
print(f'📁 Archive structure created at: {archive_dir}')
