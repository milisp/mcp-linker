use crate::{
    mcp_client::{
        chat::ChatSession,
        client::{
            common::{ChatClient, StreamingChatClient},
            llm::LlmClient,
        },
    },
    GlobalToolSet,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::sync::Mutex;
use tauri::{Emitter, State};

pub struct ChatState {
    pub session: Mutex<Option<ChatSession>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ToolInfo {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

#[derive(Deserialize, Debug)]
pub struct ChatRequest {
    message: String,
    provider: String,
    api_key: String,
    model: String,
    base_url: Option<String>,
}

#[tauri::command]
pub async fn send_message(
    request: ChatRequest,
    state: State<'_, ChatState>,
    tool_set: State<'_, GlobalToolSet>,
) -> Result<serde_json::Value, String> {
    let mut session = {
        let mut session_guard = state.session.lock().unwrap();
        let session_model = session_guard.as_ref().map(|s| s.get_model());

        let should_recreate_session =
            session_guard.is_none() || session_model.is_some_and(|m| m != request.model);

        if should_recreate_session {
            println!(
                "Creating new session with provider: {}, api_key length: {}",
                request.provider,
                request.api_key.len()
            );
            let client: Arc<dyn ChatClient> = if request.provider == "google" {
                Arc::new(LlmClient::new_gemini(
                    request.api_key.clone(),
                    request.base_url.clone(),
                    None,
                ))
            } else {
                Arc::new(LlmClient::new_openai(
                    request.api_key.clone(),
                    request.base_url.clone(),
                    None,
                ))
            };
            let mut new_session = ChatSession::new(client, (*tool_set.0).clone(), request.model);
            new_session.add_system_prompt(
                "you are a assistant, you can help user to complete various tasks.",
            );
            new_session
        } else {
            session_guard.take().unwrap()
        }
    };

    let result = session.next_message(&request.message, true).await;

    // Place the session back into the state.
    {
        let mut session_guard = state.session.lock().unwrap();
        *session_guard = Some(session);
    }

    match result {
        Ok((response_message, tool_messages)) => {
            let mut messages = vec![response_message];
            messages.extend(tool_messages);
            Ok(serde_json::to_value(messages).unwrap())
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn list_tools(state: State<'_, ChatState>) -> Result<Vec<ToolInfo>, String> {
    let session_guard = state.session.lock().unwrap();
    let session = match session_guard.as_ref() {
        Some(session) => session,
        None => return Err("Chat session not initialized".to_string()),
    };

    let tools = session.get_tools();
    let tool_infos: Vec<ToolInfo> = tools
        .iter()
        .map(|tool| ToolInfo {
            name: tool.name(),
            description: tool.description(),
            parameters: tool.parameters(),
        })
        .collect();

    Ok(tool_infos)
}

#[derive(Serialize, Clone)]
pub struct StreamingMessage {
    pub content: String,
    pub finished: bool,
}

#[tauri::command]
pub async fn send_message_stream(
    request: ChatRequest,
    state: State<'_, ChatState>,
    tool_set: State<'_, GlobalToolSet>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    println!("🚀 send_message_stream called");
    println!("📨 Request: {:?}", request);
    let mut session = {
        let mut session_guard = state.session.lock().unwrap();
        let session_model = session_guard.as_ref().map(|s| s.get_model());

        let should_recreate_session =
            session_guard.is_none() || session_model.is_some_and(|m| m != request.model);

        if should_recreate_session {
            println!(
                "Creating new session with provider: {}, api_key length: {}",
                request.provider,
                request.api_key.len()
            );
            let client: Arc<dyn ChatClient> = if request.provider == "google" {
                Arc::new(LlmClient::new_gemini(
                    request.api_key.clone(),
                    request.base_url.clone(),
                    None,
                ))
            } else {
                Arc::new(LlmClient::new_openai(
                    request.api_key.clone(),
                    request.base_url.clone(),
                    None,
                ))
            };
            let mut new_session = ChatSession::new(client, (*tool_set.0).clone(), request.model);
            new_session.add_system_prompt(
                "you are a assistant, you can help user to complete various tasks.",
            );
            new_session
        } else {
            session_guard.take().unwrap()
        }
    };

    // Direct streaming implementation
    let app_handle_clone = app_handle.clone();
    let callback = Box::new(move |chunk: String| {
        println!("Sending streaming chunk: {}", chunk);
        let streaming_msg = StreamingMessage {
            content: chunk,
            finished: false,
        };
        match app_handle_clone.emit("chat_stream", &streaming_msg) {
            Ok(_) => println!("Successfully emitted streaming chunk"),
            Err(e) => println!("Failed to emit streaming chunk: {:?}", e),
        }
    });

    // Create a direct request for streaming
    session.add_user_message(&request.message);

    let tool_definitions = {
        let tools = session.get_tool_set().tools();
        if !tools.is_empty() {
            Some(
                tools
                    .iter()
                    .map(|tool| {
                        crate::mcp_client::model::Tool::openai_format(
                            tool.name(),
                            tool.description(),
                            tool.parameters(),
                        )
                    })
                    .collect(),
            )
        } else {
            None
        }
    };

    let stream_request = crate::mcp_client::model::CompletionRequest {
        model: session.get_model(),
        messages: session.get_messages().clone(),
        temperature: Some(0.7),
        tools: tool_definitions,
    };

    // Call streaming method directly based on provider type
    println!(
        "🔥 Calling streaming method for provider: {}",
        request.provider
    );
    let result = if request.provider == "google" {
        println!("📡 Using Gemini streaming");
        let llm_client =
            LlmClient::new_gemini(request.api_key.clone(), request.base_url.clone(), None);
        llm_client.complete_stream(stream_request, callback).await
    } else {
        println!(
            "📡 Using OpenAI-compatible streaming for provider: {}",
            request.provider
        );
        // OpenAI-compatible providers (OpenAI, Ollama, OpenRouter, Anthropic, etc.)
        let llm_client =
            LlmClient::new_openai(request.api_key.clone(), request.base_url.clone(), None);
        llm_client.complete_stream(stream_request, callback).await
    };
    println!("🎯 Streaming method result: {:?}", result.is_ok());

    // Process tool calls if streaming was successful
    if let Ok(response) = &result {
        if let Some(choice) = response.choices.first() {
            println!("🔧 Checking for tool calls in streaming response");

            // Add the assistant's response message to the session
            session.add_assistant_message(choice.message.clone());

            // Process tool calls if they exist
            if choice.message.tool_calls.is_some() {
                println!("🔧 Found tool calls in streaming response, processing...");

                let messages_before = session.get_messages().len();

                // Analyze and execute tool calls
                session.analyze_tool_call(&choice.message).await;

                // Stream any new tool result messages back to the frontend
                let messages_after = session.get_messages();
                for message in &messages_after[messages_before..] {
                    if let Some(content) = &message.content {
                        println!("📤 Streaming tool result: {}", content);
                        let tool_result_msg = StreamingMessage {
                            content: format!("\n\n{}", content),
                            finished: false,
                        };
                        let _ = app_handle.emit("chat_stream", &tool_result_msg);
                    }
                }
            } else {
                println!("🔧 No tool calls found in streaming response");
            }
        }
    }

    // Send completion signal
    let completion_msg = StreamingMessage {
        content: String::new(),
        finished: true,
    };
    println!("Sending completion signal");
    match app_handle.emit("chat_stream", &completion_msg) {
        Ok(_) => println!("Successfully emitted completion signal"),
        Err(e) => println!("Failed to emit completion signal: {:?}", e),
    }

    // Place the session back into the state.
    {
        let mut session_guard = state.session.lock().unwrap();
        *session_guard = Some(session);
    }

    match result {
        Ok(_) => Ok(()),
        Err(e) => {
            println!("Streaming error: {:?}", e);
            // Send error message through stream
            let error_msg = StreamingMessage {
                content: format!("Error: {}", e),
                finished: true,
            };
            let _ = app_handle.emit("chat_stream", &error_msg);
            Err(e.to_string())
        }
    }
}
