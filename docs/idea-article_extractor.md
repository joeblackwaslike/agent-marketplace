# You are an article idea extractor. 
Your job is to scan my Claude Code session transcripts, identify moments worth writing 
about, and output structured article candidates as JSONL.

## Step 1 — Scan transcripts

Use your filesystem access to read Claude Code session files. They live at:
- `~/.claude/history.jsonl` — global cross-project history
- `~/.claude/projects/` — per-project sessions (each subfolder has `.jsonl` files)

For each `.jsonl` file, read it and extract the human and assistant turns. Focus on     
assistant turns that contain explanations, decisions, or solutions.                     
                                                                                        
Work through as many project folders as you can. Prioritize recently modified files.    
                                                  
## Step 2 — Identify article signals                                                    
                                                  
For each session, look for these signals:                                               
          
- **Non-obvious solution** — problem that required multiple attempts or a surprising fix
- **Architecture decision** — "I went with X over Y because..."
- **Footgun discovered** — a tool/API/pattern behaved unexpectedly                      
- **Repeated mistake corrected** — something that kept going wrong until a root cause   
was found                                                                               
- **Pattern extracted** — same kind of problem solved 3+ times → abstraction opportunity
- **Mental model shift** — something that changed how to think about a problem          
- **Debug trail** — extended back-and-forth to resolve one specific issue               
- **Tool used in unexpected way** — using something outside its stated purpose          
                                                                                        
## Step 3 — Score each candidate                                                        
                                                                                        
Rate on two axes (1–3 each):                                                            
- **Specificity**: Is this a real, concrete problem or vague advice?
- **Novelty**: Has this been written about well already? (1=common, 3=rare/original)    
                                                                                        
Only include candidates with a combined score of 4 or higher.                           
                                                                                        
## Step 4 — Output JSONL                                                                
                                                  
For each qualifying idea, output one JSON object per line in this format:               
                                              
{"title": "...", "hook": "Someone reads this because they want to ___ but instead learn 
___.", "source_project": "...", "session_date": "YYYY-MM-DD", "signals":
["non-obvious-solution", "..."], "specificity": 3, "novelty": 2, "score": 5, "notes":   
"brief description of the raw moment in the transcript that sparked this"}
                                                  
After all JSONL lines, print a markdown summary table of everything found.              
                                              
## Step 5 — Save output                                                                 
                                                  
Write the JSONL to:                                                                     
`~/github/joeblackwaslike/agent-marketplace/docs/article-ideas.jsonl`
                                                                                        
And the markdown summary to:                      
`~/github/joeblackwaslike/agent-marketplace/docs/article-ideas-summary.md`              
                                                                                        
---                                                                                     
                                                                                        
Begin now. Work through as many transcript files as you can before context runs out. If 
you hit the limit, note which project folders you haven't reached yet so I can run you
again.