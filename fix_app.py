
with open("C:/Users/kainm/Projects/MaiPlay/src/App.tsx", "r") as f:
    content = f.read()

if "import { BrowserRouter" in content:
    print("File is OK, just need MusicPlayer page route")
else:
    print("File is corrupted, needs full restore")
    
parts = content.split("const ArtistsPage = lazy(() =>")
if len(parts) > 1 and "import" in parts[0] and "MusicPlayerPage" not in parts[0]:
    print("Need to add MusicPlayerPage import")
    new_import = "const MusicPlayerPage = lazy(() =>\\n  import(\\'./pages/MusicPlayerPage\\').then(m => ({ default: m.MusicPlayerPage }))\\n)\\n\\n"
    content = content.replace("const MusicPage = lazy(() =>\\n  import(\\'./pages/MusicPage\\').then(m => ({ default: m.MusicPage }))\\n)\\n\\n", 
                             "const MusicPage = lazy(() =>\\n  import(\\'./pages/MusicPage\\').then(m => ({ default: m.MusicPage }))\\n)\\n\\n" + new_import)
    with open("C:/Users/kainm/Projects/MaiPlay/src/App.tsx", "w") as f:
        f.write(content)
    print("Added MusicPlayerPage import")

